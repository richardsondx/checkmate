#!/usr/bin/env ts-node

/**
 * CheckMate Status Command
 * Tests the AI model integration and shows status of specifications
 */

import { callModel } from '../lib/models.js';
import { printBanner, printBox } from '../ui/banner.js';
import chalk from 'chalk';
import { load as loadConfig } from '../lib/config.js';
import { listSpecs, parseSpec } from '../lib/specs.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

function isAnthropicModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('claude');
}

function isOpenAIModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('gpt');
}

/**
 * Status command with support for checking Type A and Type B specs
 */
export async function statusCommand(options: { type?: string } = {}): Promise<any> {
  // Print welcome banner
  printBanner();
  
  // Load configuration to check which models are being used
  const config = loadConfig();
  const reasonModel = config.models.reason;
  const quickModel = config.models.quick;
  
  // Determine which APIs are being used
  const usesAnthropicAPI = isAnthropicModel(reasonModel) || isAnthropicModel(quickModel);
  const usesOpenAIAPI = isOpenAIModel(reasonModel) || isOpenAIModel(quickModel);
  
  // Get status of specifications if requested
  if (options.type) {
    console.log(chalk.cyan(`\n⚙️  Getting status of Type ${options.type} specifications...`));
    
    // Find all specs of the requested type
    const status = await getSpecificationStatus(options.type);
    
    // Display status information
    printSpecificationStatus(status, options.type);
    
    return status; 
  } else {
    // Run model test
    console.log(chalk.cyan('\n⚙️  Running model test...'));
    
    try {
      // Test the "quick" model
      console.log(chalk.yellow(`Testing "quick" model (${quickModel}) connection...`));
      const quickResponse = await callModel(
        'quick', 
        'You are a helpful assistant.', 
        'Say hello in one word.'
      );
      console.log(chalk.green('✅ Quick model responded:'), quickResponse);
      
      // Test the "reason" model
      console.log(chalk.yellow(`\nTesting "reason" model (${reasonModel}) connection...`));
      const reasonResponse = await callModel(
        'reason', 
        'You are a helpful assistant.', 
        'Generate one sentence that describes what CheckMate does.'
      );
      console.log(chalk.green('✅ Reason model responded:'), reasonResponse);
      
      // Get specs status 
      const typeAStatus = await getSpecificationStatus('A');
      const typeBStatus = await getSpecificationStatus('B');
      
      // Build API status messages
      const apiStatusMessages = [];
      if (usesOpenAIAPI) {
        apiStatusMessages.push(`✓ OpenAI API connection successful`);
      }
      if (usesAnthropicAPI) {
        apiStatusMessages.push(`✓ Anthropic API connection successful`);
      }
      
      // Build test specification status messages
      const specStatusMessages = [];
      
      specStatusMessages.push(`Type A Specs: ${typeAStatus.total} found, ${typeAStatus.passed} passed, ${typeAStatus.failed} failed`);
      specStatusMessages.push(`Type B Specs: ${typeBStatus.total} found, ${typeBStatus.passed} passed, ${typeBStatus.failed} failed`);
      
      // Success message
      printBox(`
CheckMate Status: ${chalk.green('✅ OPERATIONAL')}

${apiStatusMessages.join('\n')}
✓ Quick model (${quickModel}) working correctly
✓ Reason model (${reasonModel}) working correctly

Test Specification Status:
${specStatusMessages.join('\n')}

Your AI-powered TDD is ready to roll! 🚀
      `);
      
      return {
        typeA: typeAStatus,
        typeB: typeBStatus
      };
      
    } catch (error) {
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
      
      return { error: true, message: 'Error connecting to AI model' };
    }
  }
}

/**
 * Get status of specifications by type
 */
async function getSpecificationStatus(type: string): Promise<{ total: number; passed: number; failed: number; specs: any[] }> {
  // Get all specs
  const allSpecs = listSpecs();
  const specsOfType: any[] = [];
  
  // Parse and filter specs by type
  for (const specPath of allSpecs) {
    try {
      const spec = parseSpec(specPath);
      
      // For Type A and Type B, look for specifications in the agent directory
      if (type === 'A' || type === 'B') {
        // Check if it's a test-specification-type-X.yaml file
        const fileName = path.basename(specPath);
        if (fileName.includes(`test-specification-type-${type.toLowerCase()}`)) {
          const requirements = spec.requirements || [];
          const passed = requirements.filter((r: any) => r.status === true).length;
          const failed = requirements.length - passed;
          
          specsOfType.push({
            path: specPath,
            name: spec.title,
            requirements: requirements.length,
            passed,
            failed
          });
        }
      } else if (type === 'YAML' && (specPath.endsWith('.yaml') || specPath.endsWith('.yml'))) {
        // For YAML specifications
        const requirements = spec.requirements || [];
        const passed = requirements.filter((r: any) => r.status === true).length;
        const failed = requirements.length - passed;
        
        specsOfType.push({
          path: specPath,
          name: spec.title,
          requirements: requirements.length,
          passed,
          failed
        });
      } else if (type === 'MARKDOWN' && specPath.endsWith('.md')) {
        // For Markdown specifications
        const requirements = spec.requirements || [];
        const passed = requirements.filter((r: any) => r.status === true).length;
        const failed = requirements.length - passed;
        
        specsOfType.push({
          path: specPath,
          name: spec.title,
          requirements: requirements.length,
          passed,
          failed
        });
      }
    } catch (error) {
      console.error(`Error parsing spec ${specPath}:`, error);
    }
  }
  
  // Calculate totals
  const total = specsOfType.length;
  const passed = specsOfType.reduce((count, spec) => count + spec.passed, 0);
  const failed = specsOfType.reduce((count, spec) => count + spec.failed, 0);
  
  return { total, passed, failed, specs: specsOfType };
}

/**
 * Display specification status
 */
function printSpecificationStatus(status: { total: number; passed: number; failed: number; specs: any[] }, type: string): void {
  console.log(chalk.cyan(`\nType ${type} Specification Status:`));
  console.log(`Total specs: ${status.total}`);
  console.log(`Total passed requirements: ${status.passed}`);
  console.log(`Total failed requirements: ${status.failed}`);
  
  if (status.specs.length > 0) {
    console.log(chalk.yellow('\nIndividual Specifications:'));
    
    // Sort specs by name
    const sortedSpecs = [...status.specs].sort((a, b) => a.name.localeCompare(b.name));
    
    // Display each spec status
    for (const spec of sortedSpecs) {
      const passRate = spec.requirements > 0 ? Math.round((spec.passed / spec.requirements) * 100) : 0;
      const statusColor = passRate === 100 ? chalk.green : passRate > 60 ? chalk.yellow : chalk.red;
      
      console.log(`${statusColor('■')} ${spec.name} - ${spec.passed}/${spec.requirements} passed (${passRate}%)`);
    }
  }
}

// When the module is executed directly, run the status command
if (import.meta.url === `file://${process.argv[1]}`) {
  await statusCommand();
} 