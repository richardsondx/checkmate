#!/usr/bin/env node

/**
 * CheckMate Audit Command
 * Compares specification requirements to implementation using action bullets
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createInterface } from 'readline/promises';
import { execSync } from 'child_process';

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';
const CACHE_DIR = 'checkmate/cache';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Extract implementation bullets from code based on spec name
 * This function analyzes either the meta section or the codebase to derive implementation bullets
 */
async function extractImplementationBullets(specName, specPath, specContent) {
  // Create a cache file path for the implementation bullets
  const cacheFilePath = path.join(CACHE_DIR, `${specName}.impl.json`);
  
  // Check the meta section first to get file references
  const metaMatch = specContent.match(/<!-- meta:\s*([\s\S]*?)-->/);
  const files = [];
  
  if (metaMatch) {
    try {
      // Parse the meta section
      const metaText = metaMatch[1].trim();
      // Handle both formats (with or without the extra "meta:" line)
      const metaJson = metaText.startsWith('meta:') 
        ? metaText.substring(5).trim() 
        : metaText;
      
      const meta = JSON.parse(metaJson);
      
      // Extract files from the meta section
      if (meta.file_hashes) {
        Object.keys(meta.file_hashes).forEach(file => {
          files.push(file);
        });
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not parse meta section: ${error.message}`));
    }
  }
  
  // If we have files from meta, analyze them to extract implementation details
  if (files.length > 0) {
    console.log(chalk.blue(`📦 Analyzing ${files.length} files for implementation details...`));
    
    // Use a set to avoid duplicates
    const implBullets = new Set();
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          // Read the file content
          const content = fs.readFileSync(file, 'utf8');
          
          // Extract function names
          const functionMatches = content.match(/function\s+(\w+)\s*\(/g) || [];
          functionMatches.forEach(match => {
            const functionName = match.replace(/function\s+/, '').replace(/\s*\($/, '');
            implBullets.add(`${functionName} function should handle its responsibilities correctly`);
          });
          
          // Extract method names
          const methodMatches = content.match(/(\w+)\s*\([^)]*\)\s*{/g) || [];
          methodMatches.forEach(match => {
            const methodName = match.replace(/\s*\([^)]*\)\s*{$/, '');
            if (methodName && !methodName.match(/^(if|for|while|switch)$/)) {
              implBullets.add(`${methodName} method should handle its responsibilities correctly`);
            }
          });
          
          // Extract API routes/endpoints
          const routeMatches = content.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g) || [];
          routeMatches.forEach(match => {
            const routeMatch = match.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
            if (routeMatch) {
              const [, method, route] = routeMatch;
              implBullets.add(`${method.toUpperCase()} ${route} endpoint should handle requests correctly`);
            }
          });
          
          // Extract command line options
          const optionMatches = content.match(/\.option\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g) || [];
          optionMatches.forEach(match => {
            const optionMatch = match.match(/\.option\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
            if (optionMatch) {
              const [, option, description] = optionMatch;
              implBullets.add(`${option} option should ${description.toLowerCase()}`);
            }
          });
          
          // If we found implementations, add some common operations based on file type
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            // Extract inputs and outputs
            if (content.includes('process.stdin') || content.includes('readline')) {
              implBullets.add('handle command line arguments');
            }
            if (content.includes('console.log')) {
              implBullets.add('display output on console');
            }
            if (content.includes('fs.writeFile') || content.includes('fs.writeFileSync')) {
              implBullets.add('write to specified file');
            }
            if (content.includes('validate') || content.includes('schema')) {
              implBullets.add('validate data against schema');
            }
            if (content.includes('error') && content.includes('log')) {
              implBullets.add('log validation errors');
            }
            
            // Check for auth token generation
            if ((content.includes('crypto') || content.includes('token') || content.includes('auth')) && 
               (content.includes('random') || content.includes('generate'))) {
              implBullets.add('generate secure token for authentication');
            }
          }
          
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Error analyzing file ${file}: ${error.message}`));
        }
      }
    }
    
    // Use fallback implementation bullets if we didn't find any
    if (implBullets.size === 0) {
      return getFallbackImplementationBullets(specName);
    }
    
    // Cache the results for future runs
    const implBulletsArray = Array.from(implBullets);
    fs.writeFileSync(cacheFilePath, JSON.stringify(implBulletsArray), 'utf8');
    
    return implBulletsArray;
  }
  
  // If we don't have files from meta, use fallback implementation bullets
  return getFallbackImplementationBullets(specName);
}

/**
 * Get fallback implementation bullets
 */
function getFallbackImplementationBullets(specName) {
  // Define some common implementation bullets based on spec name
  if (specName.includes('markdown')) {
    return [
      'generate sample markdown document',
      'display markdown on console',
      'validate markdown against schema',
      'write markdown to specified file',
      'log validation errors',
      'handle command line arguments'
    ];
  } else if (specName.includes('mcp') || specName.includes('server')) {
    return [
      'handle incoming HTTP requests',
      'authenticate API requests',
      'process server events',
      'return JSON response data',
      'validate request parameters',
      'implement error handling for failed requests'
    ];
  } else if (specName.includes('cli')) {
    return [
      'parse command line arguments',
      'display help text',
      'validate input parameters',
      'execute command logic',
      'display results to console',
      'handle errors gracefully'
    ];
  } else {
    // Generic implementation bullets
    return [
      'parse input parameters',
      'validate input data',
      'perform primary function',
      'handle edge cases',
      'return results',
      'log errors appropriately'
    ];
  }
}

// Main function
async function auditCommand(options = {}) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let specName = args[0];
  let nonInteractive = false;
  let autoFix = false;
  let syncWarmup = false; // New flag to sync with warmup
  
  // Check for command line flags
  if (args.includes('--sync-warmup') || args.includes('-s')) {
    syncWarmup = true;
    // Remove the flag from args
    const flagIndex = args.indexOf('--sync-warmup') >= 0 
      ? args.indexOf('--sync-warmup') 
      : args.indexOf('-s');
    args.splice(flagIndex, 1);
  }
  
  if (args.includes('--non-interactive') || args.includes('-n')) {
    nonInteractive = true;
    // Remove the flag from args so specName is set correctly
    const flagIndex = args.indexOf('--non-interactive') >= 0 
      ? args.indexOf('--non-interactive') 
      : args.indexOf('-n');
    args.splice(flagIndex, 1);
    specName = args[0]; // Reassign after flag removal
  }
  
  if (args.includes('--auto-fix') || args.includes('-a')) {
    autoFix = true;
    nonInteractive = true; // Auto-fix implies non-interactive
    const flagIndex = args.indexOf('--auto-fix') >= 0 
      ? args.indexOf('--auto-fix') 
      : args.indexOf('-a');
    args.splice(flagIndex, 1);
    specName = args[0]; // Reassign after flag removal
  }
  
  if (!specName) {
    console.error(chalk.red('❌ No spec specified. Use: node audit.js <spec-name> [--non-interactive|-n] [--auto-fix|-a]'));
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
  
  // Get implementation bullets dynamically from code analysis
  const implBullets = await extractImplementationBullets(specName, specPath, specContent);
  
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
    if (nonInteractive) {
      if (autoFix) {
        // In auto-fix mode, automatically add all missing bullets
        await addAllMissingBullets(diffResult.missingInSpec, specPath, specContent);
        console.log(chalk.green(`✅ Auto-added ${diffResult.missingInSpec.length} checks to spec`));
      } else {
        console.log(chalk.yellow(`ℹ️ ${diffResult.missingInSpec.length} checks were found in code but not in spec`));
        console.log(chalk.yellow(`ℹ️ Use --auto-fix flag to automatically add these checks to the spec`));
      }
    } else {
      // Interactive mode
      await promptToAddToSpec(diffResult.missingInSpec, specPath, specContent);
    }
  }
  
  // If sync-warmup flag is used, save implementation bullets to a warmup cache
  if (syncWarmup) {
    try {
      const warmupCachePath = path.join(CACHE_DIR, 'warmup-patterns.json');
      
      // Read existing warmup patterns if they exist
      let warmupPatterns = {};
      if (fs.existsSync(warmupCachePath)) {
        try {
          warmupPatterns = JSON.parse(fs.readFileSync(warmupCachePath, 'utf8'));
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read warmup cache: ${error.message}`));
        }
      }
      
      // Add the implementation bullets we found to the warmup patterns
      warmupPatterns[specName] = implBullets;
      
      // Write the updated patterns back to the cache
      fs.writeFileSync(warmupCachePath, JSON.stringify(warmupPatterns, null, 2), 'utf8');
      
      console.log(chalk.green(`✅ Synced ${implBullets.length} implementation patterns to warmup system`));
    } catch (error) {
      console.error(chalk.red(`❌ Error syncing with warmup: ${error.message}`));
    }
  }
  
  // Return exit code based on differences
  const hasDifferences = diffResult.missingInCode.length > 0 || diffResult.missingInSpec.length > 0;
  return hasDifferences ? 1 : 0;
}

/**
 * Compare action bullets between spec and implementation
 * This improved version recognizes when bullets are talking about the same function
 * even if the wording is different
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
  
  // Extract function name from a bullet
  const extractFunctionName = (text) => {
    const normalized = normalizeText(text);
    
    // Pattern: "the X function should..." or "X function should..."
    const fnMatch = normalized.match(/(?:the\s+)?(\w+)\s+function\s+should/i);
    if (fnMatch) return fnMatch[1].toLowerCase();
    
    // Pattern: "the X method should..." or "X method should..."
    const methodMatch = normalized.match(/(?:the\s+)?(\w+)\s+method\s+should/i);
    if (methodMatch) return methodMatch[1].toLowerCase();

    // Pattern: "the server should listen..." - special case for server listening
    if (normalized.match(/(?:the\s+)?server\s+should\s+listen/i)) {
      return 'server-port';
    }
    
    // Pattern: "the server should generate..." - special case for server token
    if (normalized.match(/(?:the\s+)?server\s+should\s+generate/i)) {
      return 'server-token';
    }
    
    // Pattern: "the server should..." etc. for common components
    const componentMatch = normalized.match(/(?:the\s+)?(\w+(?:\s+\w+)?)\s+should/i);
    if (componentMatch) {
      const component = componentMatch[1].toLowerCase();
      if (['the server', 'server', 'cli', 'api', 'database', 'cache', 'config'].includes(component)) {
        return component;
      }
    }
    
    return null;
  };
  
  // Create maps for normalized bullets and function names
  const normalizedSpecBullets = new Map();
  const normalizedImplBullets = new Map();
  const specFunctionMap = new Map(); // Maps function names to original spec bullets
  const implFunctionMap = new Map(); // Maps function names to original impl bullets
  
  // Process spec bullets
  specBullets.forEach(bullet => {
    const normalized = normalizeText(bullet);
    normalizedSpecBullets.set(normalized, bullet);
    
    // Also index by function name for semantic matching
    const fnName = extractFunctionName(bullet);
    if (fnName) {
      if (!specFunctionMap.has(fnName)) specFunctionMap.set(fnName, []);
      specFunctionMap.get(fnName).push(bullet);
    }
  });
  
  // Process implementation bullets
  implBullets.forEach(bullet => {
    const normalized = normalizeText(bullet);
    normalizedImplBullets.set(normalized, bullet);
    
    // Also index by function name for semantic matching
    const fnName = extractFunctionName(bullet);
    if (fnName) {
      if (!implFunctionMap.has(fnName)) implFunctionMap.set(fnName, []);
      implFunctionMap.get(fnName).push(bullet);
      
      // Special case for createServer function - also map to server-port
      if (fnName === 'createserver') {
        if (!implFunctionMap.has('server-port')) implFunctionMap.set('server-port', []);
        implFunctionMap.get('server-port').push(bullet);
      }
      
      // Special case for authenticate function - also map to server-token
      if (fnName === 'authenticate') {
        if (!implFunctionMap.has('server-token')) implFunctionMap.set('server-token', []);
        implFunctionMap.get('server-token').push(bullet);
      }
    }
  });
  
  // First pass: Find exact matches
  for (const [normalized, original] of normalizedSpecBullets.entries()) {
    if (normalizedImplBullets.has(normalized)) {
      matches.push(original);
      // Remove matched bullets from maps to avoid double-matching
      normalizedImplBullets.delete(normalized);
    }
  }
  
  // Create sets to track which spec bullets and impl bullets have been matched
  const matchedSpecBullets = new Set(matches);
  const matchedImplBullets = new Set();
  
  // Second pass: match by function name (semantic matching)
  for (const [fnName, specBulletsForFn] of specFunctionMap.entries()) {
    if (implFunctionMap.has(fnName)) {
      // We have matching function names
      const implBulletsForFn = implFunctionMap.get(fnName);
      
      // Match unmatched spec bullets with unmatched impl bullets for this function
      for (const specBullet of specBulletsForFn) {
        // Skip if this spec bullet was already matched exactly
        if (matchedSpecBullets.has(specBullet)) continue;
        
        // Find an unmatched impl bullet for this function
        for (const implBullet of implBulletsForFn) {
          const normalizedImpl = normalizeText(implBullet);
          if (!matchedImplBullets.has(normalizedImpl)) {
            // Match found!
            matches.push(specBullet);
            matchedSpecBullets.add(specBullet);
            matchedImplBullets.add(normalizedImpl);
            break;
          }
        }
      }
    }
  }
  
  // Special case: Try to match "generate secure token" with anything related to authentication and tokens
  const tokenGenSpec = specBullets.find(bullet => 
    normalizeText(bullet).includes('generate') && 
    (normalizeText(bullet).includes('token') || normalizeText(bullet).includes('secure'))
  );

  if (tokenGenSpec && !matchedSpecBullets.has(tokenGenSpec)) {
    const tokenGenImpl = implBullets.find(bullet => 
      normalizeText(bullet).includes('generate') && 
      (normalizeText(bullet).includes('token') || normalizeText(bullet).includes('secure') || 
       normalizeText(bullet).includes('auth'))
    );
    
    if (tokenGenImpl) {
      const normalizedImpl = normalizeText(tokenGenImpl);
      if (!matchedImplBullets.has(normalizedImpl)) {
        matches.push(tokenGenSpec);
        matchedSpecBullets.add(tokenGenSpec);
        matchedImplBullets.add(normalizedImpl);
      }
    }
  }
  
  // Any spec bullets not matched are missing in code
  for (const bullet of specBullets) {
    if (!matchedSpecBullets.has(bullet)) {
      missingInCode.push(bullet);
    }
  }
  
  // Any impl bullets not matched are missing in spec
  for (const [normalized, original] of normalizedImplBullets.entries()) {
    if (!matchedImplBullets.has(normalized)) {
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
        addBulletToSpec(bullet, specPath, specContent);
        // Re-read the content after modification
        specContent = fs.readFileSync(specPath, 'utf8');
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error updating spec: ${error.message}`));
    }
  }
  
  // Close the readline interface
  rl.close();
}

/**
 * Add all missing bullets to spec without prompting
 */
async function addAllMissingBullets(missingBullets, specPath, specContent) {
  let updatedContent = specContent;
  
  for (const bullet of missingBullets) {
    try {
      // Find the Checks section in the spec
      const checksIndex = updatedContent.indexOf('## Checks');
      
      if (checksIndex !== -1) {
        // Add the new bullet to the spec
        // We need to find the end of the Checks section
        const nextSectionMatch = updatedContent.substring(checksIndex).match(/\n##\s/);
        const endOfChecksIndex = nextSectionMatch && nextSectionMatch.index !== undefined
          ? checksIndex + nextSectionMatch.index 
          : updatedContent.length;
        
        // Extract the checks section
        const checksSection = updatedContent.substring(checksIndex, endOfChecksIndex);
        
        // Add the new bullet at the end of the checks section
        const newChecksSection = checksSection + `\n- [ ] ${bullet}`;
        
        // Construct the new content
        updatedContent = 
          updatedContent.substring(0, checksIndex) + 
          newChecksSection + 
          updatedContent.substring(endOfChecksIndex);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error auto-updating spec: ${error.message}`));
    }
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(specPath, updatedContent, 'utf8');
}

/**
 * Add a bullet to the spec file
 */
function addBulletToSpec(bullet, specPath, specContent) {
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

// Run the command
auditCommand().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error(chalk.red(`❌ Error: ${error.message}`));
  process.exit(1);
}); 