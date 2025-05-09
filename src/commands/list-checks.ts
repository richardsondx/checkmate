#!/usr/bin/env ts-node

/**
 * CheckMate List Checks Command
 * Returns a list of check items from a specification
 * Designed for LLM-driven TDD to retrieve checks for verification
 */

import { printCompactBanner } from '../ui/banner.js';
import chalk from 'chalk';
import { getSpecByName, parseSpec } from '../lib/specs.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'crypto';

/**
 * Interface for a Check Item
 */
export interface CheckItem {
  id: string;
  text: string;
  status: 'unchecked' | 'pass' | 'fail';
  index: number;
}

/**
 * List checks command to retrieve check items from a specification
 */
export async function listChecksCommand(options: { 
  spec?: string;
  format?: 'json' | 'text';
  cursor?: boolean;
  quiet?: boolean;
} = {}): Promise<any> {
  // Print welcome banner if not quiet
  if (!options.quiet) {
    printCompactBanner('List Checks');
  }
  
  // Check for required spec
  if (!options.spec) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No spec specified. Use --spec to specify a spec.'));
      console.log('Example: checkmate list-checks --spec feature-name');
    }
    return { error: true, message: 'No spec specified' };
  }
  
  // Get spec path
  let specPaths: string[] = [];
  try {
    specPaths = await getSpecByName(options.spec || '');
    
    if (!specPaths || specPaths.length === 0) {
      // Try treating options.spec as a direct path
      if (options.spec && fs.existsSync(options.spec)) {
        specPaths = [options.spec];
      } else if (options.spec && fs.existsSync(`checkmate/specs/${options.spec}`)) {
        // Try in the checkmate/specs directory
        specPaths = [`checkmate/specs/${options.spec}`];
      } else if (options.spec && fs.existsSync(`checkmate/specs/${options.spec}.md`)) {
        // Try with .md extension added
        specPaths = [`checkmate/specs/${options.spec}.md`];
      } else {
        // Spec not found
        if (!options.quiet) {
          console.error(chalk.red(`❌ Could not find spec "${options.spec}"`));
          console.log('Run "checkmate features" to see a list of available features.');
        }
        return { error: true, message: `Spec not found: ${options.spec}` };
      }
    }
  } catch (error) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Error searching for spec: ${error instanceof Error ? error.message : String(error)}`));
    }
    return { error: true, message: `Error searching for spec: ${error instanceof Error ? error.message : String(error)}` };
  }
  
  // Use the first matching spec
  const specPath = specPaths[0];
  
  // Parse the spec
  let specData: any;
  try {
    specData = parseSpec(specPath);
  } catch (error) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Error parsing spec: ${error instanceof Error ? error.message : String(error)}`));
    }
    return { error: true, message: `Error parsing spec: ${error instanceof Error ? error.message : String(error)}` };
  }
  
  // Extract relevant information from the spec
  const title = specData.title || path.basename(specPath, path.extname(specPath));
  const specName = path.basename(specPath, path.extname(specPath));
  
  // Process checks/requirements
  const rawChecks = specData.checks || specData.requirements || [];
  const checks: CheckItem[] = rawChecks.map((check: any, index: number) => {
    // Get the text from check
    const checkText = check.text || check.require || '';
    
    // Use 1-based indexing for better human readability (item #1, #2, etc.)
    const checkId = `${index + 1}`;
    
    return {
      id: checkId,
      text: checkText,
      status: check.status === true ? 'pass' : (check.status === false ? 'fail' : 'unchecked'),
      index
    };
  });
  
  // Prepare the result
  const result = {
    title,
    spec: specName,
    path: specPath,
    checks
  };
  
  // Output based on format
  if (options.format === 'json' || options.cursor) {
    if (!options.quiet) {
      console.log(JSON.stringify(result, null, 2));
    }
    return result;
  } else {
    // Text output
    if (!options.quiet) {
      console.log(chalk.cyan(`\nChecks for spec: ${chalk.bold(title)}`));
      console.log(chalk.dim(`${specPath}\n`));
      
      if (checks.length === 0) {
        console.log(chalk.yellow('⚠️ No checks found in this spec'));
      } else {
        checks.forEach((check, index) => {
          let statusSymbol: string;
          let statusColor: any; // chalk function
          
          if (check.status === 'pass') {
            statusSymbol = '✅';
            statusColor = chalk.green;
          } else if (check.status === 'fail') {
            statusSymbol = '❌';
            statusColor = chalk.red;
          } else {
            statusSymbol = '⬜';
            statusColor = chalk.gray;
          }
          
          console.log(`${statusColor(`${index + 1}. ${statusSymbol} ${check.text}`)}`);
        });
      }
    }
    
    return result;
  }
}

// When the module is executed directly, run the list-checks command
if (import.meta.url.endsWith(process.argv[1])) {
  listChecksCommand({
    spec: process.argv[2],
    format: (process.argv.includes('--json') ? 'json' : 'text')
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
} 