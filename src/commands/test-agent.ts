/**
 * Test Agent command for CheckMate CLI
 * 
 * This command allows testing of agent generation with different parameters
 * without persisting the results to the filesystem
 */
import * as path from 'node:path';
import chalk from 'chalk';
import * as yaml from 'yaml';
import * as fs from 'node:fs';

import { authorSpec } from '../lib/specAuthor.js';
import { load as loadConfig } from '../lib/config.js';
import { FeatureStub } from '../lib/splitter.js';

// Interface for command options
interface TestAgentOptions {
  model?: string;
  temperature?: number;
  feature: string;
  files?: string[];
  output?: string;
  dryRun: boolean;
  format?: 'yaml' | 'json';
}

/**
 * Run the test-agent command
 */
export async function testAgent(options: TestAgentOptions): Promise<void> {
  console.log(chalk.cyan('🧪 Testing agent generation...'));
  
  // Get configuration
  const config = loadConfig();
  
  // Create a feature stub from the feature description
  const featureStub: FeatureStub = {
    title: options.feature,
    description: options.feature,
    slug: options.feature
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  };
  
  // Create context files from the provided file paths
  const contextFiles = (options.files || []).map(filePath => ({
    path: filePath,
    content: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '',
    reason: 'Specified by user',
    relevance: 1.0 // Maximum relevance since user specified these files
  }));
  
  // Set up options for spec generation
  const specOptions = {
    dryRun: options.dryRun,
    agent: true,
    model: options.model || config.models?.reason || 'gpt-4o',
    temperature: options.temperature
  };
  
  console.log(chalk.yellow(`Using model: ${specOptions.model}`));
  console.log(chalk.yellow(`Temperature: ${specOptions.temperature !== undefined ? specOptions.temperature : 'default'}`));
  
  try {
    // Generate the specification
    const result = await authorSpec(featureStub, contextFiles, '', {
      dryRun: options.dryRun,
      agent: true
    });
    
    // Format output based on requested format
    let output: string;
    if (options.format === 'json') {
      output = JSON.stringify(result.spec, null, 2);
    } else {
      output = yaml.stringify(result.spec);
    }
    
    // Output to console or file based on options
    if (options.dryRun) {
      console.log(chalk.green('\nGenerated Agent (dry run):'));
      console.log(chalk.white('='.repeat(80)));
      console.log(output);
      console.log(chalk.white('='.repeat(80)));
    } else if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output);
      console.log(chalk.green(`\nAgent specification saved to: ${outputPath}`));
    } else {
      console.log(chalk.green(`\nAgent specification saved to: ${result.path}`));
    }
    
    console.log(chalk.green('✅ Test agent generation completed successfully.'));
  } catch (error) {
    console.error(chalk.red('Error generating agent:'), error);
    process.exit(1);
  }
} 