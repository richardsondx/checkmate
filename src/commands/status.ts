#!/usr/bin/env ts-node

/**
 * CheckMate Status Command
 * Shows status of specifications and requirements
 */

import { printBanner, printBox, printCompactBanner } from '../ui/banner.js';
import chalk from 'chalk';
import { listSpecs, parseSpec, getSpecByName } from '../lib/specs.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Status command to check specification status
 */
export async function statusCommand(options: { 
  target?: string, 
  cursor?: boolean,
  json?: boolean,
  quiet?: boolean
} = {}): Promise<any> {
  // Print welcome banner
  if (!options.quiet) {
    printCompactBanner('Spec Status');
  }
  
  // Check for required target
  if (!options.target) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No target specified. Use --target to specify a spec.'));
      console.log('Example: checkmate status --target cursor-integration');
    }
    return { error: true, message: 'No target specified' };
  }
  
  // Get status for a specific spec
  const specStatus = await getSpecificSpecStatus(options.target);
  
  if (specStatus.notFound) {
    if (options.json) {
      const jsonOutput = {
        error: true,
        message: `Spec not found: ${options.target}`
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      return jsonOutput;
    } else if (options.cursor) {
      console.error(`[CM-FAIL] Could not find spec "${options.target}"`);
    } else if (!options.quiet) {
      console.error(chalk.red(`❌ Could not find spec "${options.target}"`));
      console.log('Run "checkmate specs" to see a list of available specs.');
    }
    return { error: true, message: `Spec not found: ${options.target}` };
  }
  
  if (options.json) {
    // Return machine-readable JSON output
    const jsonOutput = {
      spec: specStatus.name,
      path: specStatus.path,
      total: specStatus.requirements,
      passed: specStatus.passed,
      failed: specStatus.failed,
      status: specStatus.failed > 0 ? 'FAIL' : 'PASS',
      exitCode: specStatus.failed > 0 ? 1 : 0,
      warnings: {
        hasTrivialTests: specStatus.hasTrivialTests,
        hasEmptyChecks: specStatus.requirements === 0
      }
    };
    
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  } else if (options.cursor) {
    // Output cursor-friendly format
    if (specStatus.failed > 0) {
      console.log(`[CM-FAIL] ${specStatus.name}: ${specStatus.passed}/${specStatus.requirements} passed, ${specStatus.failed} failed`);
    } else if (specStatus.requirements > 0) {
      console.log(`[CM-PASS] ${specStatus.name}: all ${specStatus.requirements} passed`);
    } else {
      console.log(`[CM-WARN] ${specStatus.name}: No requirements found or invalid spec`);
    }
  } else if (!options.quiet) {
    // Output human-readable format
    const passRate = specStatus.requirements > 0 ? Math.round((specStatus.passed / specStatus.requirements) * 100) : 0;
    const statusSymbol = specStatus.failed === 0 ? chalk.green('✔') : chalk.red('✖');
    
    console.log(chalk.cyan(`\nSpec Status: ${specStatus.name}`));
    console.log(`${statusSymbol} ${specStatus.passed} / ${specStatus.requirements} requirements passed (${passRate}%)`);
    
    if (specStatus.hasTrivialTests) {
      console.log(chalk.yellow('\n⚠️  Warning: This spec contains trivial test assertions'));
      }
    
    if (specStatus.requirements === 0) {
      console.log(chalk.yellow('\n⚠️  Warning: This spec has no requirements'));
    }
    
    // Print list of failed requirements if any
    if (specStatus.failed > 0 && specStatus.failedRequirements.length > 0) {
      console.log(chalk.red('\nFailing requirements:'));
      specStatus.failedRequirements.forEach((req, index) => {
        console.log(chalk.red(`${index + 1}. ${req.text || req.require || ''}`));
      });
    }
  }
  
  return specStatus;
}

/**
 * Get status for a specific spec by name or path
 */
async function getSpecificSpecStatus(specNameOrPath: string): Promise<{
  name: string;
  path: string;
  requirements: number;
  passed: number;
  failed: number;
  hasTrivialTests: boolean;
  notFound?: boolean;
  failedRequirements: any[];
}> {
  try {
    // Get the spec path based on name or path
    const specPaths = await getSpecByName(specNameOrPath);
    let specPath: string;
    
    if (!specPaths || specPaths.length === 0) {
      // Try treating specNameOrPath as a direct path
      if (fs.existsSync(specNameOrPath)) {
        specPath = specNameOrPath;
      } else {
        // Spec not found
        return {
          name: specNameOrPath,
          path: '',
          requirements: 0,
          passed: 0,
          failed: 0,
          hasTrivialTests: false,
          notFound: true,
          failedRequirements: []
        };
      }
    } else {
      // We'll just take the first matching spec if multiple are found
      specPath = specPaths[0];
        }
    
    // Parse the spec
    const spec = parseSpec(specPath);
    const requirements = spec.checks || spec.requirements || [];
    const passedRequirements = requirements.filter((r: any) => r.status === true);
    const failedRequirements = requirements.filter((r: any) => !r.status);
    const passed = passedRequirements.length;
    const failed = failedRequirements.length;
    
    // Check for trivial tests
    const hasTrivialTests = checkForTrivialTests(requirements);
    
    return {
      name: spec.title || path.basename(specPath, path.extname(specPath)),
          path: specPath,
          requirements: requirements.length,
          passed,
      failed,
      hasTrivialTests,
      failedRequirements
    };
    } catch (error) {
    console.error(`Error parsing spec ${specNameOrPath}:`, error);
    
    // Return a spec not found result
    return {
      name: specNameOrPath,
      path: '',
      requirements: 0,
      passed: 0,
      failed: 0,
      hasTrivialTests: false,
      notFound: true,
      failedRequirements: []
    };
  }
}

/**
 * Check if the requirements have trivial tests
 */
function checkForTrivialTests(requirements: any[]): boolean {
  for (const req of requirements) {
    if (req.test) {
      const testContent = req.test.trim();
      // Look for test blocks that only contain trivial assertions
      if (
        testContent === 'return true;' ||
        testContent === 'return true' ||
        testContent === 'true;' ||
        testContent === 'true' ||
        testContent.endsWith('// Always pass') ||
        testContent.includes('trivial assertion')
      ) {
        return true;
    }
  }
  }
  return false;
}

/**
 * Get the status of a spec file
 * @param specFilename The filename of the spec to get status for
 * @returns The spec status with checkpoints
 */
export async function getSpecStatus(specFilename: string): Promise<{
  filename: string;
  title: string;
  checkpoints: any[];
}> {
  // Get the spec path
  const specPaths = await getSpecByName(specFilename);
  const specPath = specPaths?.[0] || specFilename;
  
  // Parse the spec
  const spec = parseSpec(specPath);
  const checkpoints = spec.checks || spec.requirements || [];
  
  return {
    filename: path.basename(specPath),
    title: spec.title || path.basename(specPath, path.extname(specPath)),
    checkpoints
  };
}

/**
 * Count completed and remaining checkpoints
 * @param checkpoints Array of checkpoints
 * @returns Object with total, completed, and remaining counts
 */
export function countCheckpoints(checkpoints: any[]): {
  total: number;
  completed: number;
  remaining: number;
} {
  const total = checkpoints.length;
  const completed = checkpoints.filter((c: any) => c.status === true).length;
  const remaining = total - completed;
  
  return {
    total,
    completed,
    remaining
  };
}

// When the module is executed directly, run the status command
if (import.meta.url === `file://${process.argv[1]}`) {
  await statusCommand({ target: process.argv[2] });
} 