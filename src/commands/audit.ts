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
import { aiSummarize } from '../lib/ai-client.js';
import { testCommand } from './test.js';
import { statusCommand } from './status.js';
import * as readline from 'node:readline/promises';

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
      const specPaths = await getSpecByName(options.spec);
      
      if (!specPaths || specPaths.length === 0) {
        // Try treating specName as a direct path
        if (fs.existsSync(options.spec)) {
          specPath = options.spec;
        } else {
          // Spec not found
          if (!options.quiet) {
            console.error(chalk.red(`❌ Could not find spec "${options.spec}"`));
            console.log('Run "checkmate specs" to see a list of available specs.');
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
      
      // Parse the spec
      try {
        specData = parseSpec(specPath as string);
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
      filesToAnalyze = options.files;
    } else if (specData.files && specData.files.length > 0) {
      // Use files from the spec
      filesToAnalyze = specData.files;
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
    
    // Generate the implementation bullets
    if (!options.quiet) {
      console.log(chalk.blue('🔄 Extracting action bullets from implementation...'));
    }
    
    implBullets = await extractImplementationBullets(fileContents);
    
    // Save the bullets to cache
    fs.writeFileSync(cacheFilePath, JSON.stringify({ 
      specName,
      timestamp: new Date().toISOString(),
      bullets: implBullets
    }, null, 2), 'utf8');
    
    if (!options.quiet) {
      console.log(chalk.green(`✅ Implementation bullets cached to ${cacheFilePath}`));
    }
  }
  
  // Compare spec bullets with implementation bullets
  const diffResult = compareActionBullets(specBullets, implBullets);
  
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
    
    // Interactively prompt to add missing bullets to spec
    if (diffResult.missingInSpec.length > 0) {
      await promptToAddToSpec(diffResult.missingInSpec, specPath as string);
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
 * Extract action bullets from implementation file contents
 */
async function extractImplementationBullets(fileContents: Record<string, string>): Promise<string[]> {
  // Combine file contents into a single prompt
  const fileText = Object.entries(fileContents)
    .map(([file, content]) => `// File: ${file}\n${content}`)
    .join('\n\n');
  
  // Define stoplist for common verbs to filter out
  const stopVerbs = ['return', 'print', 'log', 'console'];
  
  // Create the prompt for the AI using the new "Action Bullet" schema
  const prompt = `
Extract the key actions performed by this code as a list of imperative action bullets.
Each bullet must follow the format: "verb + object" (e.g., "validate credentials", "hash password").

Guidelines:
- Use simple present tense imperative verbs (e.g., "create", "fetch", "validate")
- Each bullet must be a single action (do not combine multiple actions)
- Do NOT number the bullets, use plain dash (-) format
- Focus on functional behavior, not implementation details
- Filter out trivial actions like ${stopVerbs.join(', ')} unless they're primary functionality
- DO NOT use sub-bullets or nested lists

Example of good action bullets:
- validate user credentials
- fetch user profile
- create authentication token
- update database record

Return ONLY the bullet list with no introduction, description, explanation, or numbers.

Files to analyze:
${fileText}
`;

  // Call the AI to generate the bullets
  const response = await aiSummarize(prompt);
  
  // Extract just the bullet points (lines starting with -)
  const bullets = response.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.substring(2).trim())  // Remove the bullet marker
    .filter(line => line.length > 0 && !stopVerbs.some(verb => line.startsWith(verb)));
  
  return bullets;
}

/**
 * Compare action bullets between spec and implementation
 */
function compareActionBullets(specBullets: string[], implBullets: string[]): {
  matches: string[];
  missingInCode: string[];
  missingInSpec: string[];
} {
  // Use sets to store the results
  const matches: string[] = [];
  const missingInCode: string[] = [];
  const missingInSpec: string[] = [];
  
  // Normalize bullets for comparison
  const normalizeText = (text: string): string => {
    return text.toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[.,;:!?]$/g, '')  // Remove trailing punctuation
      .trim();
  };
  
  // Create normalized sets for efficient lookups
  const normalizedSpecBullets = new Map<string, string>();
  const normalizedImplBullets = new Map<string, string>();
  
  specBullets.forEach(bullet => {
    normalizedSpecBullets.set(normalizeText(bullet), bullet);
  });
  
  implBullets.forEach(bullet => {
    normalizedImplBullets.set(normalizeText(bullet), bullet);
  });
  
  // Find matches
  for (const [normalized, original] of normalizedSpecBullets.entries()) {
    if (normalizedImplBullets.has(normalized)) {
      matches.push(original);
    } else {
      missingInCode.push(original);
    }
  }
  
  // Find missing in spec
  for (const [normalized, original] of normalizedImplBullets.entries()) {
    if (!normalizedSpecBullets.has(normalized)) {
      missingInSpec.push(original);
    }
  }
  
  return { matches, missingInCode, missingInSpec };
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
          // Add the new bullet to the spec
          // We need to find the end of the Checks section
          const nextSectionMatch = specContent.substring(checksIndex).match(/\n##\s/);
          const endOfChecksIndex = nextSectionMatch && nextSectionMatch.index !== undefined
            ? checksIndex + nextSectionMatch.index 
            : specContent.length;
          
          // Extract the checks section
          const checksSection = specContent.substring(checksIndex, endOfChecksIndex);
          
          // Add the new bullet at the end of the checks section
          const newChecksSection = checksSection + `\n- [ ] ${bullet}`;
          
          // Construct the new content
          const newContent = 
            specContent.substring(0, checksIndex) + 
            newChecksSection + 
            specContent.substring(endOfChecksIndex);
          
          // Write the updated spec
          fs.writeFileSync(specPath, newContent, 'utf8');
          
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
    warnOnly: process.argv.includes('--warn-only')
  };
  
  await auditCommand(options);
} 