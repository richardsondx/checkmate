/**
 * CheckMate Auto-Files Command
 * Manages automatic file discovery for specs
 */
import chalk from 'chalk';
import ora from 'ora';
import { printBanner } from '../ui/banner.js';
import { 
  enableAutoFilesForAllSpecs, 
  updateAllAutoFiles, 
  addMetaToSpec, 
  updateAutoFiles,
  hasAutoFileDiscovery
} from '../lib/auto-files.js';
import { getSpecByName } from '../lib/specs.js';

interface AutoFilesOptions {
  enable?: boolean;
  update?: boolean;
  spec?: string;
  all?: boolean;
}

/**
 * Auto-files command handler
 */
export async function autoFilesCommand(options: AutoFilesOptions): Promise<void> {
  // Print welcome banner
  printBanner();
  
  const spinner = ora('Processing specs...').start();
  
  try {
    // Validate options - need at least one action
    if (!options.enable && !options.update) {
      spinner.fail('You must specify at least one action (--enable or --update)');
      console.log(chalk.yellow('Usage examples:'));
      console.log(chalk.dim('  checkmate auto-files --enable --all'));
      console.log(chalk.dim('  checkmate auto-files --update --spec user-auth'));
      return;
    }
    
    // Process a single spec if specified
    if (options.spec) {
      const specPath = getSpecByName(options.spec);
      
      if (!specPath) {
        spinner.fail(`Spec not found: ${options.spec}`);
        return;
      }
      
      spinner.text = `Processing spec: ${options.spec}`;
      
      // Enable auto-files if requested
      if (options.enable) {
        await addMetaToSpec(specPath, true);
        spinner.succeed(`Enabled auto-file discovery for ${options.spec}`);
        spinner.start('Continuing...');
      }
      
      // Update auto-files if requested
      if (options.update) {
        if (!hasAutoFileDiscovery(specPath) && !options.enable) {
          spinner.warn(`Auto-file discovery not enabled for ${options.spec}. Use --enable to enable it.`);
        } else {
          const newFiles = await updateAutoFiles(specPath);
          spinner.succeed(`Updated files for ${options.spec} with ${newFiles.length} files`);
          
          // Print the new files
          console.log(chalk.cyan('\nNew files:'));
          newFiles.forEach(file => console.log(chalk.dim(`  ${file}`)));
        }
      }
    }
    // Process all specs
    else if (options.all) {
      // Enable auto-files for all specs if requested
      if (options.enable) {
        spinner.text = 'Enabling auto-file discovery for all specs...';
        await enableAutoFilesForAllSpecs();
        spinner.succeed('Enabled auto-file discovery for all specs');
        spinner.start('Continuing...');
      }
      
      // Update auto-files for all specs if requested
      if (options.update) {
        spinner.text = 'Updating auto-files for all specs...';
        const results = await updateAllAutoFiles();
        
        // Count total specs and files
        const specCount = Object.keys(results).length;
        const fileCount = Object.values(results).reduce((sum, files) => sum + files.length, 0);
        
        spinner.succeed(`Updated ${specCount} specs with a total of ${fileCount} files`);
        
        // Print a summary
        console.log(chalk.cyan('\nSummary:'));
        Object.entries(results).forEach(([spec, files]) => {
          console.log(chalk.white(`  ${spec}: ${files.length} files`));
        });
      }
    } else {
      spinner.fail('You must specify either --spec or --all');
      console.log(chalk.yellow('Usage examples:'));
      console.log(chalk.dim('  checkmate auto-files --enable --all'));
      console.log(chalk.dim('  checkmate auto-files --update --spec user-auth'));
    }
    
  } catch (error: any) {
    spinner.fail('Error processing auto-files');
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Parse command-line arguments for the auto-files command
 */
export function parseAutoFilesArgs(args: any): AutoFilesOptions {
  return {
    enable: args.enable || false,
    update: args.update || false,
    spec: args.spec,
    all: args.all || false
  };
} 