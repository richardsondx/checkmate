#!/usr/bin/env ts-node

/**
 * CheckMate Status Command
 * Tests the AI model integration
 */

import { callModel } from '../lib/models.js';
import { printBanner, printBox } from '../ui/banner.js';
import chalk from 'chalk';

async function checkStatus() {
  // Print welcome banner
  printBanner();
  
  console.log(chalk.cyan('\n⚙️  Running model test...'));
  
  try {
    // Test the "quick" model
    console.log(chalk.yellow('Testing "quick" model connection...'));
    const quickResponse = await callModel(
      'quick', 
      'You are a helpful assistant.', 
      'Say hello in one word.'
    );
    console.log(chalk.green('✅ Quick model responded:'), quickResponse);
    
    // Test the "reason" model
    console.log(chalk.yellow('\nTesting "reason" model connection...'));
    const reasonResponse = await callModel(
      'reason', 
      'You are a helpful assistant.', 
      'Generate one sentence that describes what CheckMate does.'
    );
    console.log(chalk.green('✅ Reason model responded:'), reasonResponse);
    
    // Success message
    printBox(`
CheckMate Status: ${chalk.green('✅ OPERATIONAL')}

✓ OpenAI API connection successful
✓ Quick model working correctly
✓ Reason model working correctly

Your AI-powered TDD is ready to roll! 🚀
    `);
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error connecting to AI model:'), error);
    
    printBox(`
CheckMate Status: ${chalk.red('❌ ERROR')}

There was a problem connecting to the OpenAI API.
Please check:

1. Your API key in .checkmate file
2. Your internet connection
3. OpenAI service status

Run ${chalk.cyan('checkmate config')} to see your current configuration.
    `);
  }
}

// Run the status check
checkStatus(); 