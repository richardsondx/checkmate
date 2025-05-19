/**
 * CheckMate 'run-script' command
 * Allows executing scripts from the CheckMate package with proper path resolution
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { getScriptPath } from '../lib/paths.js';
import chalk from 'chalk';

interface RunScriptOptions {
  scriptName: string;
  args?: string[];
  quiet?: boolean;
}

/**
 * Run a script from the CheckMate scripts directory
 * This resolves the script path correctly even when CheckMate is used as a dependency
 * inside node_modules
 */
export async function runScriptCommand(options: RunScriptOptions): Promise<number> {
  const { scriptName, args = [], quiet = false } = options;
  
  // Determine if we should look for a JS extension
  let scriptPath = getScriptPath(`${scriptName}.js`);
  
  try {
    // Check if the script exists with .js extension
    await fs.access(scriptPath);
  } catch (error) {
    // Try without .js extension
    scriptPath = getScriptPath(scriptName);
    
    try {
      await fs.access(scriptPath);
    } catch (innerError) {
      console.error(chalk.red(`Error: Script '${scriptName}' not found.`));
      console.error(chalk.yellow('Looked in:'));
      console.error(chalk.yellow(`  - ${getScriptPath(`${scriptName}.js`)}`));
      console.error(chalk.yellow(`  - ${getScriptPath(scriptName)}`));
      return 1;
    }
  }
  
  if (!quiet) {
    console.log(chalk.blue(`Running script: ${scriptPath}`));
    if (args.length > 0) {
      console.log(chalk.blue(`Arguments: ${args.join(' ')}`));
    }
  }
  
  // Run the script with any provided arguments
  return new Promise<number>((resolve) => {
    // Execute via Node.js for .js files, or directly for shell scripts
    const isJsFile = scriptPath.endsWith('.js');
    const command = isJsFile ? 'node' : 'bash';
    const scriptArgs = isJsFile ? [scriptPath, ...args] : [scriptPath, ...args];
    
    const childProcess = spawn(command, scriptArgs, {
      stdio: 'inherit', // Inherit stdio for interactive use
      env: {
        ...process.env,
        CHECKMATE_SCRIPT_PATH: path.dirname(scriptPath) // Provide the script directory to the script
      }
    });
    
    childProcess.on('close', (code) => {
      resolve(code || 0);
    });
    
    childProcess.on('error', (err) => {
      console.error(chalk.red(`Error executing script: ${err.message}`));
      resolve(1);
    });
  });
} 