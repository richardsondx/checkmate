#!/usr/bin/env node

/**
 * Minimal test script for the audit command
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

// Get the spec name from command line
const specName = process.argv[2] || 'markdown-generation-test-command';
const specPath = path.join('checkmate/specs', `${specName}.md`);

// Read the spec file
if (!fs.existsSync(specPath)) {
  console.error(chalk.red(`❌ Could not find spec "${specName}"`));
  process.exit(1);
}

// Read the spec content
const specContent = fs.readFileSync(specPath, 'utf8');
console.log(chalk.green(`✅ Found spec: ${path.basename(specPath)}`));

// Extract checks from the spec content
const checksSection = specContent.match(/## Checks\s+([\s\S]*?)(?=##|$)/);
if (!checksSection) {
  console.error(chalk.red('❌ Could not find "## Checks" section in spec'));
  process.exit(1);
}

// Extract the bullets from the checks section
const specBullets = checksSection[1]
  .split('\n')
  .filter(line => line.trim().startsWith('- ['))
  .map(line => {
    // Remove checkbox and clean up
    return line.replace(/^\s*-\s*\[[\sxX]\]\s*/, '').trim();
  });

// Mock implementation bullets for testing
const implBullets = [
  'generate sample markdown document',
  'display markdown on console',
  'validate markdown against schema',
  'write markdown to specified file',
  'log validation errors',
  'handle command line arguments'
];

// Compare bullets and find matches and differences
const normalizeText = (text) => {
  return text.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]$/g, '')
    .trim();
};

// Create maps for normalized bullets
const normalizedSpecBullets = new Map();
const normalizedImplBullets = new Map();

specBullets.forEach(bullet => {
  normalizedSpecBullets.set(normalizeText(bullet), bullet);
});

implBullets.forEach(bullet => {
  normalizedImplBullets.set(normalizeText(bullet), bullet);
});

// Find matches, missing in code, and missing in spec
const matches = [];
const missingInCode = [];
const missingInSpec = [];

for (const [normalized, original] of normalizedSpecBullets.entries()) {
  if (normalizedImplBullets.has(normalized)) {
    matches.push(original);
  } else {
    missingInCode.push(original);
  }
}

for (const [normalized, original] of normalizedImplBullets.entries()) {
  if (!normalizedSpecBullets.has(normalized)) {
    missingInSpec.push(original);
  }
}

// Output the results
console.log(`\nSpec: ${chalk.cyan(specName)}`);
console.log('────────────');

// Print matches
matches.forEach(bullet => {
  console.log(`${chalk.green('✅')} ${bullet}`);
});

// Print missing in code
missingInCode.forEach(bullet => {
  console.log(`${chalk.red('❌')} ${bullet} ${chalk.dim('<- missing in code')}`);
});

// Print missing in spec
missingInSpec.forEach(bullet => {
  console.log(`${chalk.yellow('⚠️')} ${bullet} ${chalk.dim('<- code has, spec missing')}`);
});

// If there are bullets missing from spec, prompt to add them
if (missingInSpec.length > 0) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let bulletIndex = 0;

  const processNextBullet = () => {
    if (bulletIndex < missingInSpec.length) {
      const bullet = missingInSpec[bulletIndex];
      rl.question(`I found an action in code that isn't in spec: "${bullet}". Add it to spec? (y/N) `, (answer) => {
        const shouldAdd = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
        
        if (shouldAdd) {
          // Find where to add the bullet
          const checksIndex = specContent.indexOf('## Checks');
          if (checksIndex !== -1) {
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
          }
        }
        
        // Process the next bullet
        bulletIndex++;
        processNextBullet();
      });
    } else {
      // Done processing bullets
      rl.close();
    }
  };

  // Start processing bullets
  processNextBullet();
} else {
  process.exit(0);
} 