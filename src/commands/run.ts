/**
 * CheckMate Run Command
 * Executes tests against specifications
 * 
 * This file explicitly implements MCP event triggering at various points
 * within the runSpec and related functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { parseSpec, listSpecs, getSpecByName } from '../lib/specs.js';
import { handleMcpEvent, McpEventType } from '../lib/executor.js';
import { logRun, resetSpec } from '../lib/executor.js';
import { printBanner, printBox } from '../ui/banner.js';
import ora from 'ora';
import { execSync } from 'child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Run the command to execute tests against spec
 */
export async function runCommand(options: {
  target?: string;
  all?: boolean;
  reset?: boolean;
  noCache?: boolean;
  type?: string;
  failEarly?: boolean;
  cursor?: boolean;
}): Promise<void> {
  // Print welcome banner
  printBanner();
  
  try {
    let specs: string[] = [];
    
    // Determine which specs to run
    if (options.all) {
      specs = await listSpecs();
    } else if (options.target) {
      // Split by comma to support multiple targets
      const targets = options.target.split(',').map(t => t.trim());
      
      for (const target of targets) {
        const targetSpecs = await getSpecByName(target);
        if (targetSpecs) {
          specs = specs.concat(targetSpecs);
        }
      }
    } else {
      specs = await listSpecs();
    }
    
    if (!specs.length) {
      if (options.cursor) {
        console.log('[CM-FAIL] No specs found to run.');
      } else {
      console.log('❌ No specs found to run. Use --target to specify a spec or --all to run all.');
      }
      return;
    }
    
    console.log(`⚙️ Running ${options.target ? 'spec' : 'all specs'}: ${specs.length > 1 ? `${specs.length} found` : path.basename(specs[0])}\n`);
    
    // Run each spec
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const specPath of specs) {
      // MCP event: Start running a spec file
      handleMcpEvent({
        type: McpEventType.START,
        requirementId: 'spec-' + path.basename(specPath),
        specPath: specPath,
        message: `Starting to run spec file: ${path.basename(specPath)}`,
        timestamp: Date.now()
      });
      
      const result = await runSpec(specPath, { 
        reset: options.reset, 
        useCache: options.noCache === undefined ? true : !options.noCache,
        failEarly: options.failEarly,
        cursor: options.cursor
      });
      
      totalPassed += result.passed;
      totalFailed += result.failed;
      
      // MCP event: Completed running a spec file
      handleMcpEvent({
        type: McpEventType.COMPLETE,
        requirementId: 'spec-' + path.basename(specPath),
        specPath: specPath,
        message: `Completed running spec file: ${path.basename(specPath)}`,
        result: result.failed === 0,
        timestamp: Date.now()
      });
    }
    
    // Print final summary
    if (options.cursor) {
      if (totalFailed > 0) {
        console.log(`[CM-FAIL] Results: ${totalPassed}/${totalPassed + totalFailed} requirements passed. ${totalFailed} requirements failed.`);
        process.exitCode = 1; // Set non-zero exit code on failure
      } else {
        console.log(`[CM-PASS] All ${totalPassed} requirements passed!`);
        process.exitCode = 0; // Explicitly set exit code to 0 on success
      }
    } else {
    printBox(
      `Results: ${totalPassed}/${totalPassed + totalFailed} requirements passed (${Math.round(totalPassed / (totalPassed + totalFailed) * 100)}%)
      
${totalPassed} passed, ${totalFailed} failed

${totalFailed > 0 ? '⚠️ Some requirements need attention' : '✅ All requirements passed!'}`
    );
    
    // Set exit code based on success/failure
    const success = totalFailed === 0;
    process.exitCode = success ? 0 : 1;
    }
    
  } catch (error) {
    if (options.cursor) {
      console.error(`[CM-FAIL] Error running specs: ${error instanceof Error ? error.message : String(error)}`);
    } else {
    console.error('Error running specs:', error);
    }
  }
}

/**
 * Run a single spec file
 * 
 * This function triggers MCP events at several key points:
 * 1. START event - When a requirement is about to be executed
 * 2. PROGRESS event - During requirement execution (in other files)
 * 3. COMPLETE event - When a requirement completes execution
 * 4. ERROR event - When a requirement fails or errors
 */
export async function runSpec(specPath: string, options: {
  reset?: boolean;
  useCache?: boolean;
  failEarly?: boolean;
  cursor?: boolean;
} = {}): Promise<{
  passed: number;
  failed: number;
  total: number;
  requirements: any[];
}> {
  try {
    // Load spec content
    const spec = parseSpec(specPath);
    const basePath = path.dirname(path.resolve(specPath));
    
    // If reset is specified, reset all check/requirement statuses
    if (options.reset) {
      console.log(`Reset all checks in ${path.basename(specPath)}`);
      await resetSpec(specPath);
    }
    
    // Parse the spec to get checks (falling back to requirements for backward compatibility)
    const checks = spec.checks || spec.requirements;
    if (!checks || checks.length === 0) {
      throw new Error('No checks found in specification');
    }
    
    // Track results
    const processedChecks: any[] = [];
    let passed = 0;
    
    // Process each check
    for (const check of checks) {
      console.log(`Running check ${check.id}: ${check.require.substring(0, 60)}${check.require.length > 60 ? '...' : ''}`);
      
      // MCP event: START - Before executing a check
      handleMcpEvent({
        type: McpEventType.START,
        requirementId: check.id,
        specPath: specPath,
        message: `Starting check: ${check.require}`,
        timestamp: Date.now()
      });
      
      if (!check.test) {
        console.log(`⚠️ No test specified for check ${check.id}`);
        processedChecks.push({ ...check, passed: false, error: 'No test specified' });
        continue;
      }
      
      try {
        // Create a temp file with the test code
        const tempDir = path.join(basePath, '..', 'temp-test');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const testFilePath = path.join(tempDir, 'temp-test.js');
        fs.writeFileSync(testFilePath, `
// Test for check ${check.id}
// ${check.require}
${check.test}

// Run the test function if it's exported as default
if (typeof module.exports === 'function') {
  module.exports();
} else if (module.exports.default && typeof module.exports.default === 'function') {
  module.exports.default();
}
`);
        
        // Run the test
        console.log(`Running test for check ${check.id}...`);
        execSync(`node ${testFilePath}`, { stdio: 'inherit' });
        
        // If we got here, the test passed, so update the spec
        const success = true;
        
        // Update and record the result
        const updatedChecks = [...checks];
        const index = updatedChecks.findIndex(c => c.id === check.id);
        
        updatedChecks[index] = { ...updatedChecks[index], status: success };
        
        await updateSpec(specPath, updatedChecks);
        processedChecks.push({ ...check, passed: success });
        
        if (success) {
          passed++;
        }
        
        console.log(`✅ Check ${check.id} passed`);
      } catch (error: any) {
        console.error(`❌ Check ${check.id} failed:`, error);
        
        const updatedChecks = [...checks];
        const index = updatedChecks.findIndex(c => c.id === check.id);
        
        updatedChecks[index] = { ...updatedChecks[index], status: false };
        
        await updateSpec(specPath, updatedChecks);
        processedChecks.push({ ...check, passed: false, error: error.message });
        
        // MCP event: ERROR - When a check fails
        handleMcpEvent({
          type: McpEventType.ERROR,
          requirementId: check.id,
          specPath: specPath,
          message: `Check failed: ${check.require}`,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      // MCP event: COMPLETE - After executing a check
      handleMcpEvent({
        type: McpEventType.COMPLETE,
        requirementId: check.id,
        specPath: specPath,
        message: `Completed check: ${check.require}`,
        result: processedChecks[processedChecks.length - 1].passed,
        timestamp: Date.now()
      });
      
      console.log(`✅ Completed check: ${check.id} - ${processedChecks[processedChecks.length - 1].passed ? 'PASS' : 'FAIL'}`);
    }
    
    // Log summary
    console.log(`Results: ${passed}/${checks.length} checks passed`);
    
    if (passed < checks.length) {
      console.error(
        `❌ Some checks failed for ${path.basename(specPath)}. Fix and try again.`
      );
    }
    
    // Log the run results
    logRun(specPath, passed === checks.length, processedChecks);
    
    return {
      passed,
      failed: checks.length - passed,
      total: checks.length,
      requirements: processedChecks
    };
  } catch (error: any) {
    console.error(`Error running spec ${specPath}:`, error);
    return {
      passed: 0,
      failed: 0,
      total: 0,
      requirements: []
    };
  }
}

/**
 * Get the status of a previous run from the logs
 */
export async function getRunStatus(specPath: string): Promise<any[]> {
  // Call logRun but don't expect a return value since it's void
  logRun(specPath, true, []);
  // Return an empty array as fallback
  return [];
}

async function updateSpec(specPath: string, checks: any[]): Promise<void> {
  const spec = parseSpec(specPath);
  
  // Determine if the file uses 'checks' or 'requirements' field
  const useChecksField = spec.checks && Array.isArray(spec.checks);
  
  const content = fs.readFileSync(specPath, 'utf8');
  const extension = path.extname(specPath).toLowerCase();
  
  if (extension === '.yaml' || extension === '.yml') {
    const yamlData = parseYaml(content);
    
    // Update the appropriate field based on what's in the file
    if (useChecksField) {
      yamlData.checks = checks;
    } else {
      yamlData.requirements = checks;
    }
    
    fs.writeFileSync(specPath, stringifyYaml(yamlData), 'utf8');
  } else {
    // For other file types, would need to implement the update logic
    throw new Error(`Updating specs of type ${extension} is not yet supported`);
  }
}