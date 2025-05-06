/**
 * CheckMate Snap Command
 * Manages snapshots and renames for file change detection
 */
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as renameDetector from '../lib/rename-detector.js';
import { createSnapshot } from '../lib/spec-snapshot.js';
import { printBanner } from '../ui/banner.js';

interface SnapOptions {
  repair?: boolean;
  detect?: boolean;
  auto?: boolean;
}

/**
 * Snapshot command handler
 */
export async function snapCommand(options?: SnapOptions): Promise<void> {
  // Print welcome banner
  printBanner();
  
  // Handle different subcommands
  if (options?.repair) {
    await repairRenames(options.auto || false);
  } else if (options?.detect) {
    await detectRenames();
  } else {
    // Default action: create snapshot
    const snapshotPath = createSnapshot();
    console.log(chalk.green(`\n✅ Created specification snapshot at: ${snapshotPath}`));
    
    // Show usage information
    console.log(chalk.yellow('\nOther available options:'));
    console.log('  checkmate snap --detect   - Detect renamed files');
    console.log('  checkmate snap --repair   - Repair specs with renamed files');
    console.log('  checkmate snap --repair --auto - Automatically repair specs');
  }
}

/**
 * Detect renamed files
 */
async function detectRenames(): Promise<void> {
  console.log(chalk.cyan('\n🔍 Detecting renamed files...'));
  
  const renames = await renameDetector.detectRenames();
  
  if (renames.length === 0) {
    console.log(chalk.green('\n✅ No renamed files detected.'));
    return;
  }
  
  // Display detected renames
  console.log(chalk.green(`\n✅ Detected ${renames.length} renamed files:`));
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ ' + chalk.bold(
    'From'.padEnd(30) + 
    'To'.padEnd(30) + 
    'Confidence'.padEnd(10)
  ) + ' │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  
  // Sort by confidence, showing highest confidence first
  const sortedRenames = [...renames].sort((a, b) => b.confidence - a.confidence);
  
  sortedRenames.forEach(rename => {
    const confidenceStr = (rename.confidence * 100).toFixed(0) + '%';
    const confidenceColor = 
      rename.confidence >= 0.9 ? chalk.green :
      rename.confidence >= 0.7 ? chalk.yellow :
      chalk.red;
    
    console.log('│ ' + 
      truncate(rename.oldPath, 28).padEnd(30) + 
      truncate(rename.newPath, 28).padEnd(30) + 
      confidenceColor(confidenceStr.padEnd(10)) +
      ' │'
    );
  });
  
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  // Suggest next steps
  console.log(chalk.cyan('\nTo repair specs with these renames, run:'));
  console.log('  checkmate snap --repair');
}

/**
 * Repair specs with renamed files
 */
async function repairRenames(auto: boolean): Promise<void> {
  if (!auto) {
    console.log(chalk.cyan('\n🔍 Detecting which specs need repair...'));
  } else {
    console.log(chalk.cyan('\n🔧 Automatically repairing specs with renamed files...'));
  }
  
  // First check if there are any renames to process
  const renameMap = renameDetector.loadRenameMap();
  
  if (renameMap.length === 0) {
    console.log(chalk.yellow('\nℹ️ No renamed files detected. Run detection first:'));
    console.log('  checkmate snap --detect');
    return;
  }
  
  // Get high confidence renames only
  const highConfidenceRenames = renameMap.filter(r => r.confidence >= 0.9);
  
  if (highConfidenceRenames.length === 0) {
    console.log(chalk.yellow('\nℹ️ No high-confidence renames found. Only high-confidence renames are used for repair.'));
    return;
  }
  
  // Find specs that need repair
  const potentialChanges: { specPath: string, changes: { from: string, to: string }[] }[] = [];
  
  // Detect which specs need repair
  const { updated, skipped } = renameDetector.repairAllSpecs(false);
  
  if (updated.length === 0) {
    console.log(chalk.green('\n✅ No specs need repair.'));
    return;
  }
  
  console.log(chalk.green(`\n✅ Found ${updated.length} specs that need repair.`));
  
  // For each spec that needs repair
  for (const specPath of updated) {
    // Get potential changes
    const { changes } = renameDetector.updateRenamedFilesInSpec(specPath, false);
    
    if (changes.length > 0) {
      potentialChanges.push({ specPath, changes });
    }
  }
  
  // If auto mode, apply all changes
  if (auto) {
    // Apply all changes
    renameDetector.repairAllSpecs(true);
    console.log(chalk.green(`\n✅ Automatically repaired ${updated.length} specs.`));
    
    // Create a new snapshot after repairs
    const snapshotPath = createSnapshot();
    console.log(chalk.green(`\n✅ Created updated specification snapshot at: ${snapshotPath}`));
    return;
  }
  
  // Interactive mode - prompt for each change
  for (const { specPath, changes } of potentialChanges) {
    console.log(chalk.cyan(`\nSpec: ${specPath}`));
    console.log(chalk.dim('Changes to apply:'));
    
    changes.forEach(({ from, to }) => {
      console.log(chalk.dim(`- ${from} → ${to}`));
    });
    
    const { shouldApply } = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldApply',
      message: 'Apply these changes?',
      default: true
    });
    
    if (shouldApply) {
      // Apply the changes
      renameDetector.updateRenamedFilesInSpec(specPath, true);
      console.log(chalk.green('✅ Changes applied.'));
    } else {
      console.log(chalk.yellow('⏩ Skipped.'));
    }
  }
  
  console.log(chalk.green('\n✅ Repair process completed.'));
  
  // Create a new snapshot after repairs
  const snapshotPath = createSnapshot();
  console.log(chalk.green(`\n✅ Created updated specification snapshot at: ${snapshotPath}`));
}

/**
 * Helper function to truncate a string
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  // Keep the first part and the last part with ellipsis in the middle
  const firstPart = Math.floor(maxLength / 2) - 1;
  const lastPart = maxLength - firstPart - 3;
  
  return str.substring(0, firstPart) + '...' + str.substring(str.length - lastPart);
} 