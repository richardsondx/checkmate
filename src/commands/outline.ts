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

interface OutlineCommandOptions {
  spec?: string;
  files?: string[];
  diff?: boolean;
  depth?: number;
  format?: 'json' | 'markdown';
  auto?: boolean;
  audit?: boolean;
  quiet?: boolean;
}

/**
 * Generate an outline of the current implementation for a spec
 */
export async function outlineCommand(options: OutlineCommandOptions = {}): Promise<any> {
  // Print welcome banner
  if (!options.quiet) {
    printCompactBanner('Spec-vs-Reality: Implementation Outline');
  }
  
  // Check for required spec
  if (!options.spec && !options.auto) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No spec specified. Use --spec to specify a spec or --auto for auto-detection.'));
      console.log('Example: checkmate outline --spec user-auth');
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
    } else {
      // We'll just take the first matching spec if multiple are found
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
  }
  
  // Resolve the files to analyze
  let filesToAnalyze: string[] = [];
  
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
  
  const implOutline = await generateImplementationOutline(fileContents, options.depth || 2);
  
  // Get the spec requirements
  const specRequirements = extractSpecRequirements(specData);
  
  // Save the implementation outline to a file
  const outputDir = path.dirname(specPath || '.');
  const specName = specPath ? path.basename(specPath, path.extname(specPath)) : 'implementation';
  const outlineFilePath = path.join(outputDir, `${specName}.impl.md`);
  
  fs.writeFileSync(outlineFilePath, implOutline.text, 'utf8');
  
  if (!options.quiet) {
    console.log(chalk.green(`✅ Implementation outline saved to ${outlineFilePath}`));
  }
  
  // If diff is requested, generate a diff report
  if (options.diff) {
    if (!options.quiet) {
      console.log(chalk.blue('🔄 Generating diff report...'));
    }
    
    const diffReport = await generateDiffReport(specRequirements, implOutline.bullets);
    
    // Determine output format
    let outputContent = '';
    
    if (options.format === 'json') {
      outputContent = JSON.stringify(diffReport, null, 2);
    } else {
      // Default to markdown
      outputContent = formatDiffReportAsMarkdown(diffReport);
    }
    
    // Save the diff report to a file
    const diffFilePath = path.join(outputDir, `${specName}.diff.md`);
    fs.writeFileSync(diffFilePath, outputContent, 'utf8');
    
    if (!options.quiet) {
      console.log(chalk.green(`✅ Diff report saved to ${diffFilePath}`));
      
      // Print a summary
      const matchCount = diffReport.filter(item => item.status === 'match').length;
      const gapCount = diffReport.filter(item => item.status === 'gap').length;
      const conflictCount = diffReport.filter(item => item.status === 'conflict').length;
      
      console.log('\nSummary:');
      console.log(chalk.green(`✅ Matches: ${matchCount}`));
      console.log(chalk.yellow(`⚠️ Potential gaps: ${gapCount}`));
      console.log(chalk.red(`❌ Conflicts/Missing: ${conflictCount}`));
      
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

Files to analyze:
${fileText}
`;

  // Call the AI to generate the outline
  const response = await aiSummarize(prompt);
  
  // Extract the bullet points
  const bullets = response.split('\n')
    .filter(line => line.trim().match(/^\d+(\.\d+)*\s+\S/))
    .map(line => line.trim());
  
  return {
    text: response,
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
  const report = [];
  
  // If either array is empty, return a simple report
  if (specRequirements.length === 0 || implBullets.length === 0) {
    const status = 'conflict';
    
    if (specRequirements.length === 0) {
      // No spec requirements
      for (const implBullet of implBullets) {
        report.push({
          specBullet: '― **missing in spec** ―',
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
          implBullet: '― **missing in implementation** ―',
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
      bestMatch = '― **missing** ―';
    }
    
    report.push({
      specBullet,
      implBullet: bestMatch,
      status,
      similarity: bestSimilarity
    });
  }
  
  // Find implementation bullets not covered by spec
  const coveredImplBullets = new Set(report.map(item => item.implBullet).filter(bullet => bullet !== '― **missing** ―'));
  
  for (const implBullet of implBullets) {
    if (!coveredImplBullets.has(implBullet)) {
      report.push({
        specBullet: '― **not covered in spec** ―',
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
 * Format diff report as a Markdown table
 */
function formatDiffReportAsMarkdown(diffReport: Array<{
  specBullet: string;
  implBullet: string;
  status: 'match' | 'gap' | 'conflict';
  similarity: number;
}>): string {
  // Create header row
  const headerRow = ['#', 'Spec bullet', 'Impl bullet', 'Status'];
  const alignRow = ['-', '-----------', '-----------', '------'];
  
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
  return `# Spec vs Implementation Comparison\n\n${markdownTable}\n\nLegend:\n- ✅ Match: High similarity\n- ⚠️ Gap: Potential semantic gap\n- ❌ Conflict: Missing or conflicting implementation`;
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status: 'match' | 'gap' | 'conflict'): string {
  switch (status) {
    case 'match':
      return '✅';
    case 'gap':
      return '⚠️ (not covered)';
    case 'conflict':
      return '❌';
    default:
      return '';
  }
}

// When the module is executed directly, run the outline command
if (import.meta.url === `file://${process.argv[1]}`) {
  const options: OutlineCommandOptions = {
    spec: process.argv[2],
    diff: process.argv.includes('--diff'),
    depth: process.argv.includes('--depth') ? parseInt(process.argv[process.argv.indexOf('--depth') + 1]) : 2,
    format: process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] as 'json' | 'markdown' : 'markdown',
    audit: process.argv.includes('--audit'),
    auto: process.argv.includes('--auto')
  };
  
  await outlineCommand(options);
} 