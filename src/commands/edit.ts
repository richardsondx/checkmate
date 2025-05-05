/**
 * CheckMate Edit Command
 * Opens a spec file in the user's preferred editor
 */

import { getSpecByName } from '../lib/specs.js';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { printBanner } from '../ui/banner.js';

/**
 * Edit a specification file using the user's preferred editor
 */
export async function editCommand(options: { target: string; cursor?: boolean }): Promise<void> {
  // Print welcome banner
  if (!options.cursor) {
    printBanner();
  }
  
  if (!options.target) {
    if (options.cursor) {
      console.error('[CM-FAIL] No target specified. Use --target to specify a spec to edit.');
    } else {
      console.error('❌ No target specified. Use --target to specify a spec to edit.');
      console.log('Example: checkmate edit --target cursor-integration');
    }
    return;
  }
  
  try {
    // Get the spec file based on name or path
    const specPaths = await getSpecByName(options.target);
    
    if (!specPaths || specPaths.length === 0) {
      // Try if the target is a direct path
      if (fs.existsSync(options.target)) {
        await openEditor(options.target, options.cursor);
      } else {
        if (options.cursor) {
          console.error(`[CM-FAIL] Could not find spec "${options.target}"`);
        } else {
          console.error(`❌ Could not find spec "${options.target}"`);
          console.log('Run "checkmate status" to see a list of available specs.');
        }
      }
      return;
    }
    
    // If there are multiple specs found, let user pick one
    if (specPaths.length > 1) {
      if (options.cursor) {
        console.error(`[CM-INFO] Multiple specs match "${options.target}". Using the first one: ${path.basename(specPaths[0])}`);
      } else {
        console.log(`ℹ️ Multiple specs match "${options.target}". Using the first one: ${path.basename(specPaths[0])}`);
      }
    }
    
    // Open the first matching spec in the editor
    await openEditor(specPaths[0], options.cursor);
  } catch (error) {
    if (options.cursor) {
      console.error(`[CM-FAIL] Error editing spec: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      console.error('❌ Error editing spec:', error);
    }
  }
}

/**
 * Open a file in the user's preferred editor
 */
async function openEditor(filePath: string, cursor?: boolean): Promise<void> {
  // Get the preferred editor from environment variables
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  
  if (!cursor) {
    console.log(`🔍 Opening ${path.basename(filePath)} with ${editor}...`);
  }
  
  try {
    // Create a child process to open the editor
    const child = spawn(editor, [filePath], {
      stdio: 'inherit',
      shell: true
    });
    
    return new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) {
          if (!cursor) {
            console.log(`✅ Finished editing ${path.basename(filePath)}`);
            console.log(`${chalk.cyan('Remember:')} After editing a spec, create a new snapshot with:`);
            console.log(`${chalk.green('  node scripts/spec-snapshot.js create')}`);
          }
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      
      child.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    if (cursor) {
      console.error(`[CM-FAIL] Failed to open editor: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      console.error('❌ Failed to open editor:', error);
    }
    throw error;
  }
}

// When the module is executed directly, run the edit command with the provided args
if (import.meta.url === `file://${process.argv[1]}`) {
  // Extract the target from command line arguments
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target') + 1 || args.indexOf('-t') + 1;
  const target = targetIndex > 0 ? args[targetIndex] : undefined;
  
  await editCommand({ target: target || '' });
} 