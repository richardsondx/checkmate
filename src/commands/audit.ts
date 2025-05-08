#!/usr/bin/env ts-node

/**
 * CheckMate Audit Command
 * Compares specification requirements to implementation using action bullets
 * Shows meaningful differences and allows interactive updating of specs
 */

// @ts-ignore: Allow require in ESM
import { printCompactBanner } from '../ui/banner.js';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getSpecByName, parseSpec } from '../lib/specs.js';
import { getFileContent, getRelevantFiles } from '../lib/files.js';
import { extractActionBullets, compareBullets } from '../lib/bullet-x.js';
import { saveWarmupPatterns } from '../lib/analyzer.js';
import { testCommand } from './test.js';
import { statusCommand } from './status.js';
import * as readline from 'node:readline/promises';
import { glob } from 'glob';
import { getFeaturesData } from './features.js';

// Directory where implementation outlines are stored (cache)
const CACHE_DIR = 'checkmate/cache';

interface AuditCommandOptions {
  spec?: string;
  files?: string[];
  json?: boolean;
  quiet?: boolean;
  debug?: boolean;
  force?: boolean; // Force regeneration of bullet extraction
  warnOnly?: boolean; // Only warn on differences, don't fail
  autoSync?: boolean; // Automatically sync missing bullets to spec
}

/**
 * Audit command to compare spec action bullets with implementation action bullets
 */
export async function auditCommand(options: AuditCommandOptions = {}): Promise<any> {
  // Print welcome banner
  if (!options.quiet) {
    printCompactBanner('CheckMate Audit');
  }
  
  // Check for required spec
  if (!options.spec) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No spec specified. Use --spec to specify a spec.'));
      console.log('Example: checkmate audit --spec user-auth');
      console.log('   OR simply: checkmate audit user-auth');
    }
    return { error: true, message: 'No spec specified' };
  }
  
  let specPath: string | undefined;
  let specData: any = {};
  
  // Get the spec path based on name or path
  if (options.spec) {
    try {
      // First, check if the spec name matches a known feature
      const features = await getFeaturesData();
      // Use a non-null assertion since we've already checked options.spec exists
      const specName = options.spec;
      const matchingFeature = features.find(feature => 
        feature.slug === specName || 
        feature.slug.includes(specName) || 
        specName.includes(feature.slug)
      );
      
      if (matchingFeature && matchingFeature.filePath && fs.existsSync(matchingFeature.filePath)) {
        specPath = matchingFeature.filePath;
        if (!options.quiet) {
          console.log(chalk.green(`✅ Found spec for feature: ${matchingFeature.title}`));
        }
      } else {
        // Fall back to the traditional spec search if no matching feature found
        const specPaths = await getSpecByName(options.spec);
        
        if (!specPaths || specPaths.length === 0) {
          // Try treating specName as a direct path
          if (fs.existsSync(options.spec)) {
            specPath = options.spec;
          } else if (fs.existsSync(`checkmate/specs/${options.spec}`)) {
            // Try in the checkmate/specs directory
            specPath = `checkmate/specs/${options.spec}`;
          } else if (fs.existsSync(`checkmate/specs/${options.spec}.md`)) {
            // Try with .md extension added
            specPath = `checkmate/specs/${options.spec}.md`;
          } else {
            // Spec not found
            if (!options.quiet) {
              console.error(chalk.red(`❌ Could not find spec "${options.spec}"`));
              console.log('Run "checkmate features" to see a list of available features.');
            }
            return { error: true, message: `Spec not found: ${options.spec}` };
          }
        } else if (specPaths.length === 1) {
          // Exactly one match found
          specPath = specPaths[0];
          if (!options.quiet) {
            console.log(chalk.green(`✅ Found spec: ${path.basename(specPath)}`));
          }
        } else {
          // Multiple matches found
          if (!options.quiet) {
            console.log(chalk.yellow(`Found ${specPaths.length} potential matches for "${options.spec}":`));
            
            // Show the matches with numbers
            specPaths.forEach((specFilePath, index) => {
              const basename = path.basename(specFilePath);
              const relativePath = path.relative(process.cwd(), specFilePath);
              console.log(`  ${index + 1}. ${chalk.cyan(basename)} (${relativePath})`);
            });
            
            // Use first match by default
            console.log(chalk.yellow(`\nUsing the first match: ${path.basename(specPaths[0])}`));
          }
          specPath = specPaths[0];
        }
      }
      
      // Parse the spec
      try {
        if (specPath) {
          specData = parseSpec(specPath);
        } else {
          throw new Error(`No spec path found for ${options.spec || 'unknown'}`);
        }
      } catch (error) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error parsing spec: ${(error as Error).message}`));
        }
        return { error: true, message: `Error parsing spec: ${(error as Error).message}` };
      }
    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.red(`❌ Error searching for spec: ${(error as Error).message}`));
      }
      return { error: true, message: `Error searching for spec: ${(error as Error).message}` };
    }
  }

  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  // Set up the cache file path
  const specName = specPath ? path.basename(specPath, path.extname(specPath)) : 'unknown';
  const slug = specName.replace(/\s+/g, '-').toLowerCase();
  const cacheFilePath = path.join(CACHE_DIR, `${specName}.bullets.json`);
  
  // First run tests on the spec
  if (!options.quiet) {
    console.log(chalk.blue('🧪 Running tests for spec...'));
  }
  
  const testResult = await statusCommand({ 
    target: options.spec,
    quiet: options.quiet,
    json: true 
  });
  
  if (testResult.error) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Error running tests: ${testResult.message}`));
    }
    return { error: true, message: `Error running tests: ${testResult.message}` };
  }
  
  // Extract action bullets from the spec
  const specBullets = extractSpecActionBullets(specData);
  
  if (specBullets.length === 0) {
    if (!options.quiet) {
      console.error(chalk.yellow(`⚠️ No action bullets found in spec "${options.spec}"`));
    }
  }
  
  // Check if cached implementation bullets already exist
  let implBullets: string[] = [];
  let shouldGenerateBullets = true;
  
  if (fs.existsSync(cacheFilePath) && !options.force) {
    // Reuse existing bullets if they exist and force flag is not set
    if (!options.quiet) {
      console.log(chalk.blue(`📄 Using cached implementation bullets from ${cacheFilePath}`));
    }
    try {
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      implBullets = cachedData.bullets || [];
      shouldGenerateBullets = false;
    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.yellow(`⚠️ Error reading cached bullets, will regenerate: ${(error as Error).message}`));
      }
      shouldGenerateBullets = true;
    }
  }
  
  // Resolve the files to analyze if we need to generate bullets
  let filesToAnalyze: string[] = [];
  
  if (shouldGenerateBullets) {
    if (options.files && options.files.length > 0) {
      // Use explicitly provided files
      filesToAnalyze = options.files.flatMap(f => f.split(','));
      
      // Directly check for file existence and provide detailed output
      const validatedFiles: string[] = [];
      for (const filePath of filesToAnalyze) {
        try {
          // Check if it's a direct file path
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            validatedFiles.push(filePath);
          } else {
            // Try different variations
            const possibilities = [
              filePath,
              path.resolve(filePath),
              path.join(process.cwd(), filePath)
            ];
            
            let found = false;
            for (const possiblePath of possibilities) {
              if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isFile()) {
                validatedFiles.push(possiblePath);
                found = true;
                break;
              }
            }
            
            if (!found && !options.quiet) {
              console.warn(chalk.yellow(`⚠️ Could not find file: ${filePath}`));
            }
          }
        } catch (error) {
          if (!options.quiet) {
            console.warn(chalk.yellow(`⚠️ Error processing file path ${filePath}: ${(error as Error).message}`));
          }
        }
      }
      
      // Update to use validated files
      filesToAnalyze = validatedFiles.length > 0 ? validatedFiles : filesToAnalyze;
      
      if (!options.quiet) {
        console.log(chalk.blue(`🔍 Using ${filesToAnalyze.length} files from command line args`));
      }
    } else if (specData.files && specData.files.length > 0) {
      // Use files from the spec
      filesToAnalyze = specData.files;
      
      if (!options.quiet) {
        console.log(chalk.blue(`🔍 Using ${filesToAnalyze.length} files from spec`));
      }
    } else {
      // No files specified, use embedding to find relevant files
      if (!options.quiet) {
        console.log(chalk.blue('🔍 No files specified, finding relevant files using embeddings...'));
      }
      
      try {
        const specTitle = specData.title || (specPath ? path.basename(specPath, path.extname(specPath)) : 'unknown');
        const relevantFiles = await getRelevantFiles(specTitle, 10);
        filesToAnalyze = relevantFiles.map(file => file.path);
        
        if (!options.quiet) {
          console.log(chalk.green(`✅ Found ${filesToAnalyze.length} relevant files.`));
        }
      } catch (error) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error finding relevant files: ${(error as Error).message}`));
          console.log('Please specify files using --files option.');
        }
        return { error: true, message: `Error finding relevant files: ${(error as Error).message}` };
      }
    }
    
    if (filesToAnalyze.length === 0) {
      if (!options.quiet) {
        console.error(chalk.red('❌ No files to analyze.'));
        console.log('Please specify files using --files option.');
      }
      return { error: true, message: 'No files to analyze' };
    }
    
    // Read file contents
    const fileContents: Record<string, string> = {};
    for (const file of filesToAnalyze) {
      try {
        fileContents[file] = await getFileContent(file);
      } catch (error) {
        if (!options.quiet) {
          console.error(chalk.yellow(`⚠️ Could not read file ${file}: ${(error as Error).message}`));
        }
      }
    }
    
    // Generate the implementation bullets using the shared bullet-x module
    if (!options.quiet) {
      console.log(chalk.blue('🔄 Extracting action bullets from implementation...'));
    }
    
    try {
      implBullets = await extractActionBullets(fileContents);
      
      // Save the bullets to cache
      fs.writeFileSync(cacheFilePath, JSON.stringify({ 
        specName,
        timestamp: new Date().toISOString(),
        bullets: implBullets
      }, null, 2), 'utf8');
      
      // Update the warmup patterns cache with implementation bullets
      saveWarmupPatterns(slug, implBullets);
      
      if (!options.quiet) {
        console.log(chalk.green(`✅ Implementation bullets cached to ${cacheFilePath}`));
      }
    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.red(`❌ Error extracting action bullets: ${(error as Error).message}`));
      }
      
      // Fall back to cached bullets if they exist
      if (fs.existsSync(cacheFilePath)) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
          implBullets = cachedData.bullets || [];
          
          if (!options.quiet) {
            console.log(chalk.yellow(`⚠️ Falling back to cached implementation bullets due to extraction error.`));
          }
        } catch (cacheError) {
          // If can't read cache, return error
          return { error: true, message: `Error extracting action bullets and no valid cache found.` };
        }
      } else {
        return { error: true, message: `Error extracting action bullets: ${(error as Error).message}` };
      }
    }
  }
  
  // Compare spec bullets with implementation bullets using the shared bullet-x module
  const diffResult = compareBullets(specBullets, implBullets);
  
  // Format the results
  if (options.json) {
    const jsonOutput = {
      spec: specName,
      testStatus: testResult.status,
      matches: diffResult.matches,
      missingInCode: diffResult.missingInCode,
      missingInSpec: diffResult.missingInSpec,
      status: (diffResult.missingInCode.length === 0 && diffResult.missingInSpec.length === 0) ? 'PASS' : 'FAIL'
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  } else if (!options.quiet) {
    // Print a summary
    console.log(`\nSpec: ${chalk.cyan(specName)}`);
    console.log('────────────');
    
    // Print matches
    diffResult.matches.forEach(bullet => {
      console.log(`${chalk.green('✅')} ${bullet}`);
    });
    
    // Print missing in code
    diffResult.missingInCode.forEach(bullet => {
      console.log(`${chalk.red('❌')} ${bullet} ${chalk.dim('<- missing in code')}`);
    });
    
    // Print missing in spec
    diffResult.missingInSpec.forEach(bullet => {
      console.log(`${chalk.yellow('⚠️')} ${bullet} ${chalk.dim('<- code has, spec missing')}`);
    });
    
    // Print debug meta data if requested
    if (options.debug) {
      console.log('\n--- Debug Meta Info ---');
      console.log(`Spec path: ${specPath}`);
      console.log(`Files analyzed: ${filesToAnalyze.length}`);
      if (filesToAnalyze.length > 0) {
        console.log('Files:');
        filesToAnalyze.forEach(file => console.log(`  - ${file}`));
      }
    }
    
    // Interactively prompt to add missing bullets to spec or do it automatically
    if (diffResult.missingInSpec.length > 0) {
      if (options.autoSync) {
        await addBulletsToSpec(diffResult.missingInSpec, specPath as string);
        if (!options.quiet) {
          console.log(chalk.green(`✅ Auto-added ${diffResult.missingInSpec.length} bullets to spec`));
        }
      } else {
        await promptToAddToSpec(diffResult.missingInSpec, specPath as string);
      }
    }
    
    // If there are missing items, fail unless warn-only mode is enabled
    if (!options.warnOnly && (diffResult.missingInCode.length > 0 || diffResult.missingInSpec.length > 0)) {
      if (!options.quiet) {
        console.error(chalk.red('\n❌ Audit failed: Differences detected between spec and implementation.'));
        console.log(chalk.dim('Use --warn-only flag to prevent failure on differences.'));
      }
      return { 
        error: true, 
        message: 'Audit failed: Differences detected',
        missingInCode: diffResult.missingInCode.length,
        missingInSpec: diffResult.missingInSpec.length
      };
    }
  }
  
  return {
    spec: specName,
    test: testResult,
    matches: diffResult.matches.length,
    missingInCode: diffResult.missingInCode.length,
    missingInSpec: diffResult.missingInSpec.length
  };
}

/**
 * Extract action bullets from a spec object
 */
function extractSpecActionBullets(specData: any): string[] {
  if (!specData) {
    return [];
  }
  
  const bullets: string[] = [];
  
  // Extract from different spec formats
  if (specData.checks && Array.isArray(specData.checks)) {
    // Extract from checks
    for (const check of specData.checks) {
      if (check.text) {
        // Remove any checkbox markers and clean up
        const text = check.text.replace(/^\s*\[[\sxX]\]\s*/, '').trim();
        bullets.push(text);
      } else if (check.require) {
        bullets.push(check.require.trim());
      }
    }
  } else if (specData.requirements && Array.isArray(specData.requirements)) {
    // Extract from requirements (backward compatibility)
    for (const req of specData.requirements) {
      if (req.text) {
        const text = req.text.replace(/^\s*\[[\sxX]\]\s*/, '').trim();
        bullets.push(text);
      } else if (req.require) {
        bullets.push(req.require.trim());
      }
    }
  }
  
  return bullets;
}

/**
 * Automatically add bullets to a spec without prompting
 */
async function addBulletsToSpec(bullets: string[], specPath: string): Promise<boolean> {
  // Read the original spec content
  const specContent = fs.readFileSync(specPath, 'utf8');
  
  // Find the Checks section
  const checksIndex = specContent.indexOf('## Checks');
  if (checksIndex === -1) {
    console.error(chalk.red('❌ Could not find "## Checks" section in spec'));
    return false;
  }
  
  // Find the end of the Checks section
  const nextSectionMatch = specContent.substring(checksIndex).match(/\n##\s/);
  const endOfChecksIndex = nextSectionMatch && nextSectionMatch.index !== undefined
    ? checksIndex + nextSectionMatch.index 
    : specContent.length;
  
  // Extract the checks section
  const checksSection = specContent.substring(checksIndex, endOfChecksIndex);
  
  // Add the new bullets at the end of the checks section
  let newChecksSection = checksSection;
  for (const bullet of bullets) {
    newChecksSection += `\n- [ ] ${bullet}`;
  }
  
  // Construct the new content
  const newContent = 
    specContent.substring(0, checksIndex) + 
    newChecksSection + 
    specContent.substring(endOfChecksIndex);
  
  // Write the updated spec
  fs.writeFileSync(specPath, newContent, 'utf8');
  
  return true;
}

/**
 * Interactively prompt to add missing bullets to spec
 */
async function promptToAddToSpec(missingBullets: string[], specPath: string): Promise<boolean> {
  // Read the original spec content
  const specContent = fs.readFileSync(specPath, 'utf8');
  
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Process one bullet at a time
  for (const bullet of missingBullets) {
    try {
      // Ask user if they want to add this bullet
      const answer = await rl.question(`I found an action in code that isn't in spec: "${bullet}". Add it to spec? (y/N) `);
      const shouldAdd = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
      
      if (shouldAdd) {
        // Find the Checks section in the spec
        const checksIndex = specContent.indexOf('## Checks');
        
        if (checksIndex !== -1) {
          // Add the new bullet to the spec using the shared function
          await addBulletsToSpec([bullet], specPath);
          console.log(chalk.green(`✅ Added "${bullet}" to spec`));
        } else {
          console.error(chalk.red('❌ Could not find "## Checks" section in spec'));
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error updating spec: ${(error as Error).message}`));
    }
  }
  
  // Close the readline interface
  rl.close();
  
  return true;
}

// When the module is executed directly, run the audit command
if (import.meta.url === `file://${process.argv[1]}`) {
  const options: AuditCommandOptions = {
    spec: process.argv[2],
    json: process.argv.includes('--json'),
    quiet: process.argv.includes('--quiet'),
    debug: process.argv.includes('--debug'),
    force: process.argv.includes('--force'),
    warnOnly: process.argv.includes('--warn-only'),
    autoSync: process.argv.includes('--auto-sync')
  };
  
  await auditCommand(options);
} 