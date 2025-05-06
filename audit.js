#!/usr/bin/env node

/**
 * CheckMate Audit Command
 * Compares specification requirements to implementation using action bullets
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createInterface } from 'readline/promises';

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';
const CACHE_DIR = 'checkmate/cache';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Main function
async function auditCommand(options = {}) {
  const specName = process.argv[2];
  
  if (!specName) {
    console.error(chalk.red('❌ No spec specified. Use: node audit.js <spec-name>'));
    process.exit(1);
  }
  
  console.log(chalk.cyan('CheckMate Audit'));
  console.log(chalk.dim('────────────────────────'));
  
  // Find the spec
  const specPath = path.join(SPECS_DIR, `${specName}.md`);
  
  if (!fs.existsSync(specPath)) {
    console.error(chalk.red(`❌ Could not find spec "${specName}"`));
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ Found spec: ${path.basename(specPath)}`));
  
  // Read the spec content
  const specContent = fs.readFileSync(specPath, 'utf8');
  
  // Extract the checks section
  const checksSection = specContent.match(/## Checks\s+([\s\S]*?)(?=##|$)/);
  if (!checksSection) {
    console.error(chalk.red('❌ Could not find "## Checks" section in spec'));
    process.exit(1);
  }
  
  // Extract bullets from the checks section
  const specBullets = checksSection[1]
    .split('\n')
    .filter(line => line.trim().startsWith('- ['))
    .map(line => line.replace(/^\s*-\s*\[[\sxX]\]\s*/, '').trim())
    .filter(line => line.length > 0);
  
  if (specBullets.length === 0) {
    console.error(chalk.yellow(`⚠️ No action bullets found in spec "${specName}"`));
  } else {
    console.log(chalk.blue(`📄 Found ${specBullets.length} requirements in spec`));
  }
  
  // Mock implementation bullets for demonstration
  // In a real implementation, these would be extracted from code
  const implBullets = [
    'generate sample markdown document',
    'display markdown on console',
    'validate markdown against schema',
    'write markdown to specified file',
    'log validation errors',
    'handle command line arguments'
  ];
  
  // Compare spec bullets with implementation bullets
  const diffResult = compareActionBullets(specBullets, implBullets);
  
  // Print results
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
  
  // Interactively prompt to add missing bullets to spec
  if (diffResult.missingInSpec.length > 0) {
    await promptToAddToSpec(diffResult.missingInSpec, specPath, specContent);
  }
  
  // Return exit code based on differences
  const hasDifferences = diffResult.missingInCode.length > 0 || diffResult.missingInSpec.length > 0;
  return hasDifferences ? 1 : 0;
}

/**
 * Compare action bullets between spec and implementation
 */
function compareActionBullets(specBullets, implBullets) {
  // Use arrays to store the results
  const matches = [];
  const missingInCode = [];
  const missingInSpec = [];
  
  // Normalize bullets for comparison
  const normalizeText = (text) => {
    return text.toLowerCase()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[.,;:!?]$/g, '')  // Remove trailing punctuation
      .trim();
  };
  
  // Create normalized maps for efficient lookups
  const normalizedSpecBullets = new Map();
  const normalizedImplBullets = new Map();
  
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
async function promptToAddToSpec(missingBullets, specPath, specContent) {
  // Create readline interface
  const rl = createInterface({
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
      console.error(chalk.red(`❌ Error updating spec: ${error.message}`));
    }
  }
  
  // Close the readline interface
  rl.close();
}

// Run the command
auditCommand().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(chalk.red(`❌ Error: ${error.message}`));
  process.exit(1);
}); 