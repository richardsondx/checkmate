#!/usr/bin/env ts-node

/**
 * CheckMate Verify LLM Reasoning Command
 * Verifies the logical reasoning of an LLM's self-assessment of a check item
 * Part of the LLM-driven TDD workflow
 */

import { printCompactBanner } from '../ui/banner.js';
import chalk from 'chalk';
import { getSpecByName, parseSpec } from '../lib/specs.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { reason } from '../lib/models.js';
import * as telemetry from '../lib/telemetry.js';

/**
 * Verify LLM reasoning command
 * Takes the LLM's defined success/failure conditions and outcome report
 * Uses the reason model to check logical consistency and updates the spec
 */
export async function verifyLlmReasoningCommand(options: { 
  spec?: string;
  checkId?: string;
  successCondition?: string;
  failureCondition?: string;
  outcomeReport?: string;
  explanationFile?: string;
  cursor?: boolean;
  quiet?: boolean;
  debug?: boolean;
} = {}): Promise<any> {
  // Start telemetry session
  telemetry.startSession('verify-llm-reasoning');

  // Print welcome banner
  if (!options.quiet) {
    printCompactBanner('Verify LLM Reasoning');
  }
  
  // Validate required arguments
  const missingArgs = [];
  if (!options.spec) missingArgs.push('--spec');
  if (!options.checkId) missingArgs.push('--check-id');
  if (!options.successCondition) missingArgs.push('--success-condition');
  if (!options.failureCondition) missingArgs.push('--failure-condition');
  if (!options.outcomeReport) missingArgs.push('--outcome-report');
  
  if (missingArgs.length > 0) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Missing required arguments: ${missingArgs.join(', ')}`));
      console.log('Example: checkmate verify-llm-reasoning --spec feature-name --check-id check_0 ' + 
                  '--success-condition "Password is hashed" ' +
                  '--failure-condition "Password is plaintext" ' +
                  '--outcome-report "Found bcrypt hash in database"');
    }
    return { 
      error: true, 
      message: `Missing required arguments: ${missingArgs.join(', ')}`,
      missingArgs
    };
  }
  
  // Get spec path
  let specPaths: string[] = [];
  try {
    specPaths = await getSpecByName(options.spec || '');
    
    if (!specPaths || specPaths.length === 0) {
      // Try alternate paths
      if (options.spec && fs.existsSync(options.spec)) {
        specPaths = [options.spec];
      } else if (options.spec && fs.existsSync(`checkmate/specs/${options.spec}`)) {
        specPaths = [`checkmate/specs/${options.spec}`];
      } else if (options.spec && fs.existsSync(`checkmate/specs/${options.spec}.md`)) {
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
  
  // Get checks from the spec
  const checks = specData.checks || specData.requirements || [];
  
  // Find the specific check by ID
  let checkIndex = -1;
  
  // First try parsing the ID as a number for position-based lookup
  const numericId = parseInt(options.checkId || '', 10);
  
  if (!isNaN(numericId) && numericId > 0 && numericId <= checks.length) {
    // Valid numeric ID (1-based), convert to 0-based index
    checkIndex = numericId - 1;
  } else {
    // Fall back to the old ID-based search for compatibility
    checkIndex = checks.findIndex((check: any) => {
      return check.id === options.checkId || 
             String(check.id || '').includes(options.checkId || '');
    });
  }
  
  if (checkIndex === -1) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Check with ID "${options.checkId}" not found in spec`));
      console.log('Available checks:');
      checks.forEach((check: any, index: number) => {
        const checkText = check.text || check.require || '';
        console.log(`  ${index + 1}: ${checkText}`);
      });
    }
    return { error: true, message: `Check with ID "${options.checkId}" not found in spec` };
  }
  
  const check = checks[checkIndex];
  
  // Setup prompt for the reason model
  const systemPrompt = `You are a logical reasoning validator.
Your task is to determine if an LLM's Outcome Report logically satisfies its own Success Condition while avoiding its Failure Condition.
You are purely checking logical consistency, not re-verifying the code implementation yourself.
You must reason step by step, then provide either "PASS" or "FAIL" with a brief explanation if "FAIL".
Your response must start with "PASS" or "FAIL:" (with a colon if FAIL).
Be strict but fair - the outcome must clearly satisfy the success condition and avoid the failure condition.`;

  const prompt = `
Given the following:
LLM's Success Condition (SC): "${options.successCondition}"
LLM's Failure Condition (FC): "${options.failureCondition}"
LLM's Outcome Report (OR): "${options.outcomeReport}"

Does the LLM's Outcome Report (OR) definitively and logically satisfy its own Success Condition (SC) AND definitively avoid its Failure Condition (FC)?

Analyze this step by step, then respond with only "PASS" or "FAIL: brief explanation".`;

  if (options.debug) {
    if (!options.quiet) {
      console.log(chalk.dim('\nDebug - Prompt:'));
      console.log(chalk.dim(prompt));
      console.log(chalk.dim('\nDebug - System Prompt:'));
      console.log(chalk.dim(systemPrompt));
    }
  }
  
  try {
    // Call the reason model to assess logical consistency
    const modelResponse = await reason(prompt, systemPrompt);
    
    if (options.debug) {
      if (!options.quiet) {
        console.log(chalk.dim('\nDebug - Model Response:'));
        console.log(chalk.dim(modelResponse));
      }
    }
    
    // Determine if the reasoning passes or fails
    // The model should respond with either "PASS" or "FAIL: <reason>"
    // Currently checks if it starts with "PASS" but we need to handle the case where the explanation includes "PASS" at the end
    
    // Trim the response and convert to uppercase for easier comparison
    const trimmedResponse = modelResponse.trim();
    
    // Check for exact "PASS" at the beginning or end of the response
    const isPassing = 
      trimmedResponse === 'PASS' || 
      trimmedResponse.startsWith('PASS ') || 
      trimmedResponse.endsWith('\nPASS') ||
      trimmedResponse.endsWith(' PASS');
      
    const explanation = isPassing ? 'Logical check passed' : modelResponse.trim();
    
    // If the user wants the explanation saved to a file, save it
    if (options.explanationFile && !isPassing) {
      try {
        fs.writeFileSync(options.explanationFile, explanation, 'utf8');
        if (!options.quiet) {
          console.log(chalk.blue(`📝 Explanation written to ${options.explanationFile}`));
        }
      } catch (fileError) {
        console.error(chalk.yellow(`⚠️ Could not write explanation to file: ${fileError instanceof Error ? fileError.message : String(fileError)}`));
      }
    }
    
    // Update the spec file
    const content = fs.readFileSync(specPath, 'utf8');
    
    let updatedContent: string;
    const extension = path.extname(specPath).toLowerCase();
    
    if (extension === '.yaml' || extension === '.yml') {
      // Handle YAML specs
      try {
        // For YAML files, we need to parse, update, and rewrite
        const yaml = require('yaml');
        const specData = yaml.parse(content);
        
        // Update the check status in the YAML data
        const checksArray = specData.checks || specData.requirements || [];
        if (checksArray[checkIndex]) {
          checksArray[checkIndex].status = isPassing;
        }
        
        // Serialize back to YAML
        updatedContent = yaml.stringify(specData);
      } catch (yamlError) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error updating YAML spec: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`));
        }
        return {
          error: true,
          message: `Error updating YAML spec: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`
        };
      }
    } else {
      // Handle Markdown specs
      try {
        let updatedOrError = updateSpecFileWithCheckMark(content, check.text || check.require || '', isPassing, specPath, options);
        if (typeof updatedOrError === 'object' && updatedOrError.error) {
          // Error already logged by updateSpecFileWithCheckMark if not quiet
          // Consider how to propagate this error or handle it
          // For now, let's rethrow or return an error status from the command itself
          return { 
            error: true, 
            message: updatedOrError.message, 
            passed: false, 
            reason: `Failed to update spec file: ${updatedOrError.message}` 
          };
        }
        updatedContent = updatedOrError as string;
      } catch (mdError) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error processing Markdown spec update: ${mdError instanceof Error ? mdError.message : String(mdError)}`));
        }
        return {
          error: true,
          message: `Error processing Markdown spec update: ${mdError instanceof Error ? mdError.message : String(mdError)}`
        };
      }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(specPath, updatedContent, 'utf8');
    
    // Success message
    if (isPassing) {
      if (!options.quiet) {
        console.log(chalk.green(`✅ Logical verification PASSED for check "${check.text || check.require || ''}"`));
        console.log(chalk.green(`✅ Spec "${path.basename(specPath)}" has been updated, check marked as [🟩]`));
      }
      return {
        success: true,
        result: 'PASS',
        spec: path.basename(specPath, path.extname(specPath)),
        checkId: options.checkId,
        checkText: check.text || check.require || ''
      };
    } else {
      const failureReason = modelResponse.replace(/^FAIL:\s*/, '').trim();
      if (!options.quiet) {
        console.log(chalk.red(`❌ Logical verification FAILED for check "${check.text || check.require || ''}"`));
        console.log(chalk.red(`❌ Reason: ${failureReason}`));
        console.log(chalk.red(`✍️ Spec "${path.basename(specPath)}" has been updated, check marked as [🟥]`));
      }
      return {
        success: false,
        result: 'FAIL',
        reason: failureReason,
        spec: path.basename(specPath, path.extname(specPath)),
        checkId: options.checkId,
        checkText: check.text || check.require || ''
      };
    }
  } catch (error) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Error during logical verification: ${error instanceof Error ? error.message : String(error)}`));
    }
    return { 
      error: true, 
      message: `Error during logical verification: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Update the status of a check in a Markdown spec file
 */
function updateSpecFileWithCheckMark(
  content: string, 
  checkText: string, 
  isPassing: boolean,
  specPath: string,
  options: { quiet?: boolean } = {}
): string | { error: boolean, message: string } {
  // Escape regex special characters in checkText
  const escapedCheckText = checkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Regex to find the checkbox line, allowing for x, X, ✓, ✖ or space initially
  // This ensures we can find and replace old formats too.
  const checkboxRegex = new RegExp(`- \\[([ xX✓✖])\\] ${escapedCheckText}`);
  const newStatusChar = isPassing ? '🟩' : '🟥'; // Use new emoji markers
  
  const newCheckLine = `- [${newStatusChar}] ${checkText}`;

  // Check if the line exists with any of the old markers or space
  if (checkboxRegex.test(content)) {
    const updatedContent = content.replace(checkboxRegex, newCheckLine);
    // It's good practice to check if replacement actually happened, 
    // though .replace with a non-global regex that matches should always replace one instance.
    if (fs.existsSync(specPath)) {
      try {
        fs.writeFileSync(specPath, updatedContent, 'utf8');
        if (!options.quiet) {
          if (isPassing) {
            console.log(chalk.green(`✅ Spec "${path.basename(specPath)}" has been updated, check marked as [🟩]`));
          } else {
            console.log(chalk.red(`✍️ Spec "${path.basename(specPath)}" has been updated, check marked as [🟥]`));
          }
        }
        return updatedContent;
      } catch (error) {
        if (!options.quiet) {
          console.error(chalk.red(`❌ Error writing updated spec file "${specPath}": ${error instanceof Error ? error.message : String(error)}`));
        }
        return { error: true, message: `Failed to write spec file: ${specPath}` };
      }
    } else {
        if (!options.quiet) {
            console.error(chalk.red(`❌ Spec file not found for writing: "${specPath}"`));
        }
        return { error: true, message: `Spec file not found: ${specPath}` };
    }
  } else {
    if (!options.quiet) {
      console.warn(chalk.yellow(`⚠️ Could not find check line to update in "${specPath}" for: "${checkText}". Spec file might be out of sync or check text changed.`));
    }
    // Return original content if line not found, or indicate no update was made
    return content; // Or return an object indicating no update if preferred
  }
}

// When the module is executed directly, run the verify-llm-reasoning command
if (import.meta.url.endsWith(process.argv[1])) {
  verifyLlmReasoningCommand({
    spec: process.argv.find((arg, i) => arg === '--spec' && i + 1 < process.argv.length) ? 
      process.argv[process.argv.indexOf('--spec') + 1] : undefined,
    checkId: process.argv.find((arg, i) => arg === '--check-id' && i + 1 < process.argv.length) ?
      process.argv[process.argv.indexOf('--check-id') + 1] : undefined,
    successCondition: process.argv.find((arg, i) => arg === '--success-condition' && i + 1 < process.argv.length) ?
      process.argv[process.argv.indexOf('--success-condition') + 1] : undefined,
    failureCondition: process.argv.find((arg, i) => arg === '--failure-condition' && i + 1 < process.argv.length) ?
      process.argv[process.argv.indexOf('--failure-condition') + 1] : undefined,
    outcomeReport: process.argv.find((arg, i) => arg === '--outcome-report' && i + 1 < process.argv.length) ?
      process.argv[process.argv.indexOf('--outcome-report') + 1] : undefined,
    explanationFile: process.argv.find((arg, i) => arg === '--explanation-file' && i + 1 < process.argv.length) ?
      process.argv[process.argv.indexOf('--explanation-file') + 1] : undefined,
    debug: process.argv.includes('--debug'),
    quiet: process.argv.includes('--quiet')
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
} 