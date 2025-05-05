#!/usr/bin/env ts-node

/**
 * CheckMate Test Command
 * Tests the AI model integration and connectivity
 */

import { callModel } from '../lib/models.js';
import { printBanner, printBox } from '../ui/banner.js';
import chalk from 'chalk';
import { load as loadConfig } from '../lib/config.js';

function isAnthropicModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('claude');
}

function isOpenAIModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('gpt');
}

/**
 * Test command with support for checking AI models and connectivity
 */
export async function testCommand(options: { 
  cursor?: boolean,
  quiet?: boolean,
  json?: boolean
} = {}): Promise<any> {
  // Print welcome banner
  if (!options.quiet) {
    printBanner();
  }
  
  // Load configuration to check which models are being used
  const config = loadConfig();
  const reasonModel = config.models.reason;
  const quickModel = config.models.quick;
  
  // Determine which APIs are being used
  const usesAnthropicAPI = isAnthropicModel(reasonModel) || isAnthropicModel(quickModel);
  const usesOpenAIAPI = isOpenAIModel(reasonModel) || isOpenAIModel(quickModel);
  
  // Run model test
  if (!options.quiet) {
    console.log(chalk.cyan('\n⚙️ Running model test...'));
  }
  
  try {
    // Test the "quick" model
    if (!options.quiet) {
      console.log(chalk.yellow(`Testing "quick" model (${quickModel}) connection...`));
    }
    const quickResponse = await callModel(
      'quick', 
      'You are a helpful assistant.', 
      'Say hello in one word.'
    );
    if (!options.quiet) {
      console.log(chalk.green('✅ Quick model responded:'), quickResponse);
    }
    
    // Test the "reason" model
    if (!options.quiet) {
      console.log(chalk.yellow(`\nTesting "reason" model (${reasonModel}) connection...`));
    }
    const reasonResponse = await callModel(
      'reason', 
      'You are a helpful assistant.', 
      'Generate one sentence that describes what CheckMate does.'
    );
    if (!options.quiet) {
      console.log(chalk.green('✅ Reason model responded:'), reasonResponse);
    }
    
    // Build API status messages
    const apiStatusMessages = [];
    if (usesOpenAIAPI) {
      apiStatusMessages.push(`✓ OpenAI API connection successful`);
    }
    if (usesAnthropicAPI) {
      apiStatusMessages.push(`✓ Anthropic API connection successful`);
    }
    
    if (options.json) {
      const jsonOutput = {
        status: 'OPERATIONAL',
        models: {
          quick: {
            name: quickModel,
            status: 'OK',
            response: quickResponse
          },
          reason: {
            name: reasonModel,
            status: 'OK',
            response: reasonResponse
          }
        },
        apis: {
          openai: usesOpenAIAPI ? { status: 'OK' } : undefined,
          anthropic: usesAnthropicAPI ? { status: 'OK' } : undefined
        }
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      return jsonOutput;
    } else if (options.cursor) {
      console.log('[CM-PASS] CheckMate operational with working AI models and API connections');
    } else if (!options.quiet) {
      // Success message
      printBox(`
CheckMate Status: ${chalk.green('✅ OPERATIONAL')}

${apiStatusMessages.join('\n')}
✓ Quick model (${quickModel}) working correctly
✓ Reason model (${reasonModel}) working correctly

Your AI-powered TDD is ready to roll! 🚀
      `);
    }
    
    return {
      status: 'OPERATIONAL',
      quick: quickModel,
      reason: reasonModel
    };
    
  } catch (error) {
    if (options.json) {
      const jsonOutput = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      return jsonOutput;
    } else if (options.cursor) {
      console.error(`[CM-FAIL] Error connecting to AI model: ${error instanceof Error ? error.message : String(error)}`);
    } else if (!options.quiet) {
      console.error(chalk.red('\n❌ Error connecting to AI model:'), error);
      
      // Build error help messages based on which APIs are in use
      const errorHelp = [];
      if (usesOpenAIAPI) {
        errorHelp.push(`- Check your OpenAI API key (${config.openai_key ? 'configured' : 'missing'})`);
      }
      if (usesAnthropicAPI) {
        errorHelp.push(`- Check your Anthropic API key (${config.anthropic_key ? 'configured' : 'missing'})`);
      }
      errorHelp.push('- Check your internet connection');
      
      // Add API status messages
      const apiServiceMessages = [];
      if (usesOpenAIAPI) {
        apiServiceMessages.push('- OpenAI service status');
      }
      if (usesAnthropicAPI) {
        apiServiceMessages.push('- Anthropic service status');
      }
      
      printBox(`
CheckMate Status: ${chalk.red('❌ ERROR')}

There was a problem connecting to the AI model.
Please check:

${errorHelp.join('\n')}
${apiServiceMessages.join('\n')}

Run ${chalk.cyan('checkmate config')} to see your current configuration.
      `);
    }
    
    return { error: true, message: 'Error connecting to AI model' };
  }
}

// When the module is executed directly, run the test command
if (import.meta.url === `file://${process.argv[1]}`) {
  await testCommand();
} 