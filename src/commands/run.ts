/**
 * Run commands for CheckMate CLI
 * Executes spec requirements and updates their status
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as specs from '../lib/specs.js';
import * as executor from '../lib/executor.js';
import { printBox } from '../ui/banner.js';

/**
 * Run all checks for a specific spec
 */
export async function runSpec(specPath: string, reset: boolean = true): Promise<boolean> {
  try {
    // Get the spec basename for display
    const specName = path.basename(specPath);
    
    console.log(`\nRunning spec: ${specName}`);
    console.log('----------------------------------------');
    
    // Parse the spec file
    const parsedSpec = specs.parseSpec(specPath);
    
    // Track overall success
    let allPassed = true;
    
    // Process each requirement
    for (let i = 0; i < parsedSpec.requirements.length; i++) {
      const req = parsedSpec.requirements[i];
      const reqText = req.text;
      
      // Skip if already checked
      if (req.status) {
        console.log(`✅ Already passed: ${reqText}`);
        continue;
      }
      
      // Execute the requirement
      console.log(`⏳ Testing: ${reqText}`);
      const passed = await executor.executeRequirement(reqText, specPath);
      
      // Update status based on result
      req.status = passed;
      allPassed = allPassed && passed;
      
      // Show result
      if (passed) {
        console.log(`✅ PASS: ${reqText}`);
      } else {
        console.log(`❌ FAIL: ${reqText}`);
      }
    }
    
    // Update the spec file with new statuses
    executor.updateSpec(specPath, parsedSpec.requirements);
    
    // Log the run
    executor.logRun(specPath, allPassed, parsedSpec.requirements);
    
    // If all passed and reset is true, reset the spec
    if (allPassed && reset) {
      console.log('\nAll requirements passed! Resetting for next run.');
      executor.resetSpec(specPath);
    }
    
    // Print summary
    const total = parsedSpec.requirements.length;
    const passed = parsedSpec.requirements.filter(r => r.status).length;
    
    console.log('----------------------------------------');
    console.log(`Results: ${passed}/${total} requirements passed`);
    
    if (allPassed) {
      printBox(`✅ All requirements passed for ${specName}`);
    } else {
      printBox(`❌ Some requirements failed for ${specName}. Fix and try again.`);
    }
    
    return allPassed;
  } catch (error) {
    console.error(`Error running spec ${specPath}:`, error);
    return false;
  }
}

/**
 * Run all specs
 */
export async function runAll(reset: boolean = true): Promise<boolean> {
  const specFiles = specs.listSpecs();
  
  if (specFiles.length === 0) {
    console.log('No spec files found. Generate one with "checkmate gen".');
    return true;
  }
  
  console.log(`Running ${specFiles.length} specs...`);
  
  let allPassed = true;
  
  for (const specFile of specFiles) {
    const specPassed = await runSpec(specFile, reset);
    allPassed = allPassed && specPassed;
  }
  
  return allPassed;
}

/**
 * Run a subset of specs by name or path
 */
export async function runTarget(targets: string[], reset: boolean = true): Promise<boolean> {
  if (!targets || targets.length === 0) {
    // If no targets specified, run all specs
    return runAll(reset);
  }
  
  let allPassed = true;
  
  for (const target of targets) {
    // Try to find the spec file
    const specPath = specs.getSpecByName(target);
    
    if (!specPath) {
      console.error(`Spec not found: ${target}`);
      allPassed = false;
      continue;
    }
    
    const specPassed = await runSpec(specPath, reset);
    allPassed = allPassed && specPassed;
  }
  
  return allPassed;
}

/**
 * Run the next unchecked requirement in a spec
 */
export async function runNext(specPath: string): Promise<boolean> {
  try {
    // Get the spec basename for display
    const specName = path.basename(specPath);
    
    console.log(`\nRunning next unchecked requirement in: ${specName}`);
    console.log('----------------------------------------');
    
    // Parse the spec file
    const parsedSpec = specs.parseSpec(specPath);
    
    // Find the first unchecked requirement
    const uncheckedIndex = parsedSpec.requirements.findIndex(req => !req.status);
    
    if (uncheckedIndex === -1) {
      console.log('All requirements are already checked!');
      return true;
    }
    
    const req = parsedSpec.requirements[uncheckedIndex];
    
    // Execute the requirement
    console.log(`⏳ Testing: ${req.text}`);
    const passed = await executor.executeRequirement(req.text, specPath);
    
    // Update status based on result
    req.status = passed;
    
    // Show result
    if (passed) {
      console.log(`✅ PASS: ${req.text}`);
    } else {
      console.log(`❌ FAIL: ${req.text}`);
    }
    
    // Update the spec file with new status
    executor.updateSpec(specPath, parsedSpec.requirements);
    
    // Log the run
    executor.logRun(specPath, passed, [{ text: req.text, status: passed }]);
    
    // Check if all requirements are now checked
    const allChecked = parsedSpec.requirements.every(r => r.status);
    
    if (allChecked) {
      console.log('\nAll requirements are now checked!');
      
      // Ask if user wants to reset
      printBox(`✅ All requirements are now checked. Run 'checkmate run' to reset.`);
    }
    
    return passed;
  } catch (error) {
    console.error(`Error running next requirement in ${specPath}:`, error);
    return false;
  }
} 