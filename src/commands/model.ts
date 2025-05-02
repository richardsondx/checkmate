/**
 * Model commands for CheckMate CLI
 * Manages AI model configuration
 */
import { load as loadConfig, updateModel } from '../lib/config.js';
import { printBox } from '../ui/banner.js';
import chalk from 'chalk';

/**
 * List available model slots and their configured values
 */
export function listModels(): void {
  const config = loadConfig();
  
  console.log(chalk.cyan('\nConfigured Models:'));
  console.log(chalk.gray('─'.repeat(50)));
  
  // Print the reason model
  console.log(`${chalk.bold('reason')} (detailed analysis):`);
  console.log(`  ${config.models.reason}`);
  
  // Print the quick model
  console.log(`\n${chalk.bold('quick')} (fast checks):`);
  console.log(`  ${config.models.quick}`);
  
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`To change a model, use: ${chalk.yellow('checkmate model set <slot> <model>')}`);
}

/**
 * Set a model for a specific slot
 */
export function setModel(slot: 'reason' | 'quick', modelName: string): void {
  // Update the model in the config
  updateModel(slot, modelName);
  
  // Display confirmation
  printBox(`Model for ${slot} slot set to: ${modelName}`);
}

/**
 * Print detailed information about models
 */
export function printModelInfo(): void {
  const config = loadConfig();
  
  console.log(chalk.cyan('\nModel Slots:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  console.log(`${chalk.bold('reason')} - Used for generating detailed specs from descriptions`);
  console.log(`  Current: ${chalk.green(config.models.reason)}`);
  console.log(`  Recommended: GPT-4o or GPT-4`);
  console.log(`  This model needs strong reasoning capabilities to create specs.`);
  
  console.log(`\n${chalk.bold('quick')} - Used for fast checks during test runs`);
  console.log(`  Current: ${chalk.green(config.models.quick)}`);
  console.log(`  Recommended: GPT-4o-mini or GPT-3.5-turbo`);
  console.log(`  This model handles pass/fail decisions during test execution.`);
  
  console.log(chalk.gray('─'.repeat(60)));
  
  // Display API key status
  const apiKey = config.openai_key || '';
  const hasKey = apiKey && apiKey.length > 0;
  const keyStatus = hasKey 
    ? chalk.green('✓ API key is configured') 
    : chalk.red('✗ No API key found');
    
  console.log(`\nAPI Key: ${keyStatus}`);
  
  if (!hasKey) {
    console.log(chalk.yellow('\nTo set an API key, add to your .checkmate file:'));
    console.log(chalk.gray('openai_key: "sk-..."'));
    console.log(chalk.yellow('\nOr use an environment variable:'));
    console.log(chalk.gray('openai_key: "env:OPENAI_API_KEY"'));
  }
} 