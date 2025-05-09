/**
 * CheckMate Reset Command
 * Resets the status of all checks in a spec file to unchecked [ ].
 */

import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSpecByName } from '../lib/specs.js';
import { printCompactBanner } from '../ui/banner.js';

export async function resetCommand(options: { 
  specName: string;
  quiet?: boolean;
}): Promise<{ success: boolean; message: string; error?: any }> {
  if (!options.quiet) {
    printCompactBanner('Reset Spec Status');
  }

  if (!options.specName) {
    if (!options.quiet) {
      console.error(chalk.red('❌ No spec name provided.'));
    }
    return { success: false, message: 'No spec name provided.' };
  }

  try {
    const specPaths = await getSpecByName(options.specName);
    if (!specPaths || specPaths.length === 0) {
      if (!options.quiet) {
        console.error(chalk.red(`❌ Spec "${options.specName}" not found.`));
      }
      return { success: false, message: `Spec "${options.specName}" not found.` };
    }

    const specPath = specPaths[0]; // Use the first match

    if (path.extname(specPath).toLowerCase() !== '.md') {
      if (!options.quiet) {
        console.warn(chalk.yellow(`⚠️ Reset command currently only supports Markdown (.md) specs. "${specPath}" is not a Markdown file.`));
      }
      // For now, we'll just skip non-markdown. Future: handle YAML if needed.
      return { success: true, message: `Skipped non-Markdown spec: ${specPath}` }; 
    }

    let content = fs.readFileSync(specPath, 'utf8');

    // Regex to find any type of checkbox [x], [X], [ ], [🟩], [🟥]
    // and replace the content inside the brackets with a space.
    // Use an OR group for emojis to ensure correct matching.
    const updatedContent = content.replace(/- \[(x|X| |🟩|🟥)\]/g, '- [ ]');

    if (content === updatedContent) {
      if (!options.quiet) {
        console.log(chalk.blue(`ℹ️ Spec "${path.basename(specPath)}" already appears to be reset (all checks are '[ ]'). No changes made.`));
      }
    } else {
      fs.writeFileSync(specPath, updatedContent, 'utf8');
      if (!options.quiet) {
        console.log(chalk.green(`✅ Spec "${path.basename(specPath)}" has been reset. All checks set to '[ ]'.`));
      }
    }
    return { success: true, message: `Spec "${path.basename(specPath)}" reset successfully.` };

  } catch (error) {
    if (!options.quiet) {
      console.error(chalk.red(`❌ Error resetting spec "${options.specName}":`), error);
    }
    return { success: false, message: `Error resetting spec "${options.specName}"`, error };
  }
} 