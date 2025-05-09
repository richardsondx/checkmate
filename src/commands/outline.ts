#!/usr/bin/env ts-node

/**
 * CheckMate Outline Command
 * Generates a pseudocode outline of the current implementation and optionally compares it with the spec
 */

import { printCompactBanner } from '../ui/banner.js';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getSpecByName, parseSpec } from '../lib/specs.js';
import { getFileContent, getRelevantFiles } from '../lib/files.js';
import { aiSummarize } from '../lib/ai-client.js';
import { createTwoColumnMarkdownTable } from '../ui/markdown.js';
import * as telemetry from '../lib/telemetry.js';

// Directory where implementation outlines are stored
const IMPLEMENTATIONS_DIR = 'checkmate/implementations';

interface OutlineCommandOptions {
  spec?: string;
  files?: string[];
  diff?: boolean;
  depth?: number;
  format?: 'json' | 'markdown';
  auto?: boolean;
  audit?: boolean;
  quiet?: boolean;
  force?: boolean; // Force regeneration of outline
}

/**
 * Generate an outline of the current implementation for a spec
 */
export async function outlineCommand(options: OutlineCommandOptions = {}): Promise<any> {
  // Start telemetry session
  telemetry.startSession('outline');

  // Print welcome banner
  if (!options.quiet) {
    printCompactBanner('Spec-vs-Reality: Implementation Outline');
  }
  
  // Check for required spec
  if (!options.spec && !options.auto) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No spec specified. Use --spec to specify a spec or --auto for auto-detection.'));
      console.log('Example: checkmate outline --spec user-auth');
      console.log('   OR simply: checkmate outline user-auth');
    }
    return { error: true, message: 'No spec specified' };
  }
  
  let specPath: string | undefined;
  let specData: any = {};
  
  // If auto mode is enabled, try to detect the spec from current context
  if (options.auto) {
    // Auto-detection logic will be implemented later
    // For now, we'll just log that this feature is coming soon
    if (!options.quiet) {
      console.error(chalk.yellow('⚠️ Auto-detection is not implemented yet.'));
      console.log('Please specify a spec using --spec option.');
    }
    return { error: true, message: 'Auto-detection not implemented' };
  }
  
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
        // Multiple matches found, ask user to select one
        if (!options.quiet) {
          console.log(chalk.yellow(`Found ${specPaths.length} potential matches for "${options.spec}":`));
          
          // Show the matches with numbers
          specPaths.forEach((specFilePath, index) => {
            const basename = path.basename(specFilePath);
            const relativePath = path.relative(process.cwd(), specFilePath);
            console.log(`  ${index + 1}. ${chalk.cyan(basename)} (${relativePath})`);
          });
          
          // Use first match by default if in non-interactive context
          console.log(chalk.yellow(`\nUsing the first match: ${path.basename(specPaths[0])}`));
          console.log(`To select a different match, specify the full name: ${chalk.cyan(`checkmate outline ${path.basename(specPaths[0], path.extname(specPaths[0]))}`)})`);
          
          specPath = specPaths[0];
        } else {
          // In quiet mode, just use the first match
          specPath = specPaths[0];
        }
      }
      
      // Parse the spec
      try {
        specData = parseSpec(specPath as string);
      } catch (error) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error parsing spec: ${(error as Error).message}`));
          // Print more details to help debug the issue
          console.error(`  Path: ${specPath}`);
          if (fs.existsSync(specPath as string)) {
            console.error(`  File exists: Yes`);
          } else {
            console.error(`  File exists: No`);
          }
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

  // Ensure implementations directory exists
  if (!fs.existsSync(IMPLEMENTATIONS_DIR)) {
    fs.mkdirSync(IMPLEMENTATIONS_DIR, { recursive: true });
  }
  
  // Set up the output file paths
  const specName = specPath ? path.basename(specPath, path.extname(specPath)) : 'implementation';
  const outlineFilePath = path.join(IMPLEMENTATIONS_DIR, `${specName}.impl.md`);
  const diffFilePath = path.join(IMPLEMENTATIONS_DIR, `${specName}.diff.md`);
  
  // Check if implementation outline already exists
  let implOutline: { text: string; bullets: string[] } = { text: '', bullets: [] };
  let shouldGenerateOutline = true;
  
  if (fs.existsSync(outlineFilePath) && !options.force) {
    // Reuse existing outline if it exists and force flag is not set
    if (!options.quiet) {
      console.log(chalk.blue(`📄 Using existing implementation outline from ${outlineFilePath}`));
    }
    try {
      const existingOutline = fs.readFileSync(outlineFilePath, 'utf8');
      
      // Remove the heading/description if it exists
      const startIndex = existingOutline.indexOf('1. ');
      const cleanedOutline = startIndex !== -1 ? existingOutline.substring(startIndex) : existingOutline;
      
      // Extract bullet points
      const bullets = cleanedOutline.split('\n')
        .filter(line => line.trim().match(/^\d+(\.\d+)*\s+\S/))
        .map(line => line.trim());
      
      implOutline = {
        text: cleanedOutline,
        bullets
      };
      
      shouldGenerateOutline = false;
    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.yellow(`⚠️ Error reading existing outline, will regenerate: ${(error as Error).message}`));
      }
      shouldGenerateOutline = true;
    }
  }
  
  // Resolve the files to analyze if we need to generate an outline
  let filesToAnalyze: string[] = [];
  
  if (shouldGenerateOutline) {
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
    
    // Generate the implementation outline
    if (!options.quiet) {
      console.log(chalk.blue('🔄 Generating implementation outline...'));
    }
    
    implOutline = await generateImplementationOutline(fileContents, options.depth || 2);
    
    // Save the clean implementation outline (without descriptive text)
    const titlePrefix = `# ${specData.title || specName} Implementation\n\n`;
    fs.writeFileSync(outlineFilePath, titlePrefix + implOutline.text, 'utf8');
    
    if (!options.quiet) {
      console.log(chalk.green(`✅ Implementation outline saved to ${outlineFilePath}`));
    }
  }
  
  // Get the spec requirements
  const specRequirements = extractSpecRequirements(specData);
  
  // Always generate the diff report (enabled by default unless explicitly disabled)
  const shouldGenerateDiff = options.diff !== false;
  
  if (shouldGenerateDiff) {
    if (!options.quiet) {
      console.log(chalk.blue('🔄 Generating comparison report between spec and implementation...'));
    }
    
    const diffReport = await generateDiffReport(specRequirements, implOutline.bullets);
    
    // Determine output format
    let outputContent = '';
    
    if (options.format === 'json') {
      outputContent = JSON.stringify(diffReport, null, 2);
    } else {
      // Default to markdown
      outputContent = formatDiffReportAsMarkdown(diffReport, specData.title || specName);
    }
    
    // Save the diff report to a file
    fs.writeFileSync(diffFilePath, outputContent, 'utf8');
    
    if (!options.quiet) {
      console.log(chalk.green(`✅ Comparison report saved to ${diffFilePath}`));
      
      // Print a summary
      const matchCount = diffReport.filter(item => item.status === 'match').length;
      const gapCount = diffReport.filter(item => item.status === 'gap').length;
      const conflictCount = diffReport.filter(item => item.status === 'conflict').length;
      
      console.log('\n📊 Comparison Summary:');
      console.log(chalk.green(`✅ Matches: ${matchCount}`));
      console.log(chalk.yellow(`⚠️ Potential gaps: ${gapCount}`));
      console.log(chalk.red(`❌ Conflicts/Missing: ${conflictCount}`));
      
      // Print the diff report to the console
      console.log('\n' + chalk.cyan('===== SPEC VS IMPLEMENTATION COMPARISON =====\n'));
      
      // Create and display a pretty table for terminal output
      const prettyTable = createPrettyTable(diffReport);
      console.log(prettyTable);
      
      // If audit mode is enabled and there are conflicts, fail
      if (options.audit && conflictCount > 0) {
        console.error(chalk.red('\n❌ Audit failed: Conflicts detected between spec and implementation.'));
        return { error: true, message: 'Audit failed: Conflicts detected' };
      }
    }
    
    return {
      outline: implOutline,
      diff: diffReport,
      outlineFile: outlineFilePath,
      diffFile: diffFilePath,
      summary: {
        matches: diffReport.filter(item => item.status === 'match').length,
        gaps: diffReport.filter(item => item.status === 'gap').length,
        conflicts: diffReport.filter(item => item.status === 'conflict').length
      }
    };
  }
  
  return {
    outline: implOutline,
    outlineFile: outlineFilePath
  };
}

/**
 * Generate an implementation outline from file contents
 */
async function generateImplementationOutline(fileContents: Record<string, string>, depth: number = 2): Promise<{
  text: string;
  bullets: string[];
}> {
  // Combine file contents into a single prompt
  const fileText = Object.entries(fileContents)
    .map(([file, content]) => `// File: ${file}\n${content}`)
    .join('\n\n');
  
  // Create the prompt for the AI
  const prompt = `
Summarize the functional steps of these files in bullet pseudocode with present imperative verbs.
Use numbered bullets with exactly ${depth} levels deep.
Focus only on the executable flow and important logic.

Example format:
1. receive POST /login
   1.1 validate email + password
   1.2 fetch user by email
   ...

Return ONLY the bulleted list with no introduction, description, or explanation text.

Files to analyze:
${fileText}
`;

  // Call the AI to generate the outline
  const response = await aiSummarize(prompt);
  
  // Extract the bullet points and remove any descriptive text
  let cleanText = response;
  const firstBulletIndex = response.indexOf('1. ');
  if (firstBulletIndex !== -1) {
    cleanText = response.substring(firstBulletIndex);
  }
  
  const bullets = cleanText.split('\n')
    .filter(line => line.trim().match(/^\d+(\.\d+)*\s+\S/))
    .map(line => line.trim());
  
  return {
    text: cleanText,
    bullets
  };
}

/**
 * Extract requirements from the spec data
 */
function extractSpecRequirements(specData: any): string[] {
  if (!specData) {
    return [];
  }
  
  const requirements: string[] = [];
  
  // Extract from different spec formats
  if (specData.checks && Array.isArray(specData.checks)) {
    // YAML spec format
    for (const check of specData.checks) {
      if (check.text) {
        requirements.push(check.text);
      } else if (check.require) {
        requirements.push(check.require);
      }
    }
  } else if (specData.requirements && Array.isArray(specData.requirements)) {
    // Markdown spec format
    for (const req of specData.requirements) {
      if (req.text) {
        requirements.push(req.text);
      } else if (req.require) {
        requirements.push(req.require);
      }
    }
  }
  
  return requirements;
}

/**
 * Generate a diff report comparing spec requirements to implementation bullets
 */
async function generateDiffReport(specRequirements: string[], implBullets: string[]): Promise<Array<{
  specBullet: string;
  implBullet: string;
  status: 'match' | 'gap' | 'conflict';
  similarity: number;
}>> {
  const report: Array<{
    specBullet: string;
    implBullet: string;
    status: 'match' | 'gap' | 'conflict';
    similarity: number;
  }> = [];
  
  // If either array is empty, return a simple report
  if (specRequirements.length === 0 || implBullets.length === 0) {
    const status: 'match' | 'gap' | 'conflict' = 'conflict';
    
    if (specRequirements.length === 0) {
      // No spec requirements
      for (const implBullet of implBullets) {
        report.push({
          specBullet: '❓ Not in spec',
          implBullet,
          status,
          similarity: 0
        });
      }
    } else {
      // No implementation bullets
      for (const specBullet of specRequirements) {
        report.push({
          specBullet,
          implBullet: '❌ Missing',
          status,
          similarity: 0
        });
      }
    }
    
    return report;
  }
  
  // For each spec requirement, find the best matching implementation bullet
  for (const specBullet of specRequirements) {
    let bestMatch = '';
    let bestSimilarity = 0;
    
    for (const implBullet of implBullets) {
      const similarity = calculateSimilarity(specBullet, implBullet);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = implBullet;
      }
    }
    
    // Determine status based on similarity score
    let status: 'match' | 'gap' | 'conflict';
    
    if (bestSimilarity >= 0.8) {
      status = 'match';
    } else if (bestSimilarity >= 0.4) {
      status = 'gap';
    } else {
      status = 'conflict';
      bestMatch = '❌ Missing';
    }
    
    report.push({
      specBullet,
      implBullet: bestMatch,
      status,
      similarity: bestSimilarity
    });
  }
  
  // Find implementation bullets not covered by spec
  const coveredImplBullets = new Set(report.map(item => item.implBullet).filter(bullet => bullet !== '❌ Missing'));
  
  for (const implBullet of implBullets) {
    if (!coveredImplBullets.has(implBullet)) {
      report.push({
        specBullet: '❓ Not in spec',
        implBullet,
        status: 'gap',
        similarity: 0
      });
    }
  }
  
  return report;
}

/**
 * Calculate similarity between two strings (simple implementation)
 */
function calculateSimilarity(a: string, b: string): number {
  // Convert to lowercase and tokenize by splitting on non-alphanumeric chars
  const tokensA = a.toLowerCase().split(/\W+/).filter(Boolean);
  const tokensB = b.toLowerCase().split(/\W+/).filter(Boolean);
  
  // Count common tokens
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  
  // Calculate Jaccard similarity
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * Format diff report as a Markdown table and terminal output
 */
function formatDiffReportAsMarkdown(diffReport: Array<{
  specBullet: string;
  implBullet: string;
  status: 'match' | 'gap' | 'conflict';
  similarity: number;
}>, title: string): string {
  // Create header row
  const headerRow = ['#', 'Spec Requirement', 'Implementation', 'Status'];
  const alignRow = ['-', '---------------', '--------------', '------'];
  
  // Create data rows
  const dataRows = diffReport.map((item, index) => {
    const statusEmoji = getStatusEmoji(item.status);
    
    return [
      (index + 1).toString(),
      `"${item.specBullet}"`,
      `"${item.implBullet}"`,
      statusEmoji
    ];
  });
  
  // Create full table data
  const tableData = [headerRow, alignRow, ...dataRows];
  
  // Generate markdown table
  const markdownTable = createTwoColumnMarkdownTable(tableData);
  
  // Add title and legend
  return `# ${title}: Spec vs Implementation Comparison\n\n${markdownTable}\n\n## Legend\n- ✅ Match: High similarity between spec and implementation\n- ⚠️ Gap: Potential semantic gap, functionality exists but may not fully match\n- ❌ Conflict: Missing or conflicting implementation`;
}

/**
 * Get emoji for status with color support
 */
function getStatusEmoji(status: 'match' | 'gap' | 'conflict'): string {
  switch (status) {
    case 'match':
      return chalk.green('✅');
    case 'gap':
      return chalk.yellow('⚠️');
    case 'conflict':
      return chalk.red('❌');
    default:
      return '';
  }
}

/**
 * Create a pretty table for console output
 */
function createPrettyTable(diffReport: Array<{
  specBullet: string;
  implBullet: string;
  status: 'match' | 'gap' | 'conflict';
  similarity: number;
}>): string {
  // Get max column widths for formatting
  const maxNumWidth = Math.max(String(diffReport.length).length, 2);
  const maxSpecWidth = Math.min(40, Math.max(...diffReport.map(item => item.specBullet.length), 15));
  const maxImplWidth = Math.min(40, Math.max(...diffReport.map(item => item.implBullet.length), 15));
  
  // Box drawing characters
  const hLine = '─';
  const vLine = '│';
  const tl = '┌';
  const tr = '┐';
  const bl = '└';
  const br = '┘';
  const lJoin = '├';
  const rJoin = '┤';
  const tJoin = '┬';
  const bJoin = '┴';
  const cross = '┼';
  
  // Create header
  const topBorder = `${tl}${hLine.repeat(maxNumWidth + 2)}${tJoin}${hLine.repeat(maxSpecWidth + 2)}${tJoin}${hLine.repeat(maxImplWidth + 2)}${tJoin}${hLine.repeat(8)}${tr}`;
  
  const headerRow = `${vLine} ${'#'.padEnd(maxNumWidth)} ${vLine} ${'Spec Requirement'.padEnd(maxSpecWidth)} ${vLine} ${'Implementation'.padEnd(maxImplWidth)} ${vLine} Status ${vLine}`;
  
  const midBorder = `${lJoin}${hLine.repeat(maxNumWidth + 2)}${cross}${hLine.repeat(maxSpecWidth + 2)}${cross}${hLine.repeat(maxImplWidth + 2)}${cross}${hLine.repeat(8)}${rJoin}`;
  
  // Create data rows
  const dataRows = diffReport.map((item, idx) => {
    const num = (idx + 1).toString().padEnd(maxNumWidth);
    
    let spec = item.specBullet;
    let impl = item.implBullet;
    
    // Truncate if too long
    if (spec.length > maxSpecWidth) {
      spec = spec.substring(0, maxSpecWidth - 3) + '...';
    }
    
    if (impl.length > maxImplWidth) {
      impl = impl.substring(0, maxImplWidth - 3) + '...';
    }
    
    const statusEmoji = getStatusEmoji(item.status);
    const status = statusEmoji.padStart(4).padEnd(6);
    
    return `${vLine} ${num} ${vLine} ${spec.padEnd(maxSpecWidth)} ${vLine} ${impl.padEnd(maxImplWidth)} ${vLine} ${status} ${vLine}`;
  });
  
  const bottomBorder = `${bl}${hLine.repeat(maxNumWidth + 2)}${bJoin}${hLine.repeat(maxSpecWidth + 2)}${bJoin}${hLine.repeat(maxImplWidth + 2)}${bJoin}${hLine.repeat(8)}${br}`;
  
  // Combine all parts
  return [
    topBorder,
    headerRow,
    midBorder,
    ...dataRows,
    bottomBorder
  ].join('\n');
}

// When the module is executed directly, run the outline command
if (import.meta.url === `file://${process.argv[1]}`) {
  const options: OutlineCommandOptions = {
    spec: process.argv[2],
    diff: process.argv.includes('--diff') || true, // Enable diff by default
    depth: process.argv.includes('--depth') ? parseInt(process.argv[process.argv.indexOf('--depth') + 1]) : 2,
    format: process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] as 'json' | 'markdown' : 'markdown',
    audit: process.argv.includes('--audit'),
    auto: process.argv.includes('--auto'),
    force: process.argv.includes('--force') // Add force flag to regenerate outline
  };
  
  await outlineCommand(options);
} 