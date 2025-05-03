#!/usr/bin/env ts-node

/**
 * CheckMate MCP Setup Command
 * Sets up Cursor integration by creating/updating .cursor/config.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from '../lib/config.js';
import { printBox } from '../ui/banner.js';
import chalk from 'chalk';

const CURSOR_CONFIG_DIR = '.cursor';
const CURSOR_CONFIG_FILE = path.join(CURSOR_CONFIG_DIR, 'config.json');

// Define types for the configuration
interface MCPServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: any;
}

async function setupMcp() {
  console.log(chalk.cyan('🔧 Setting up CheckMate MCP for Cursor...'));
  
  // Ensure .cursor directory exists
  if (!fs.existsSync(CURSOR_CONFIG_DIR)) {
    fs.mkdirSync(CURSOR_CONFIG_DIR, { recursive: true });
    console.log(chalk.green(`✅ Created ${CURSOR_CONFIG_DIR} directory`));
  }
  
  // Load CheckMate config to get API keys if available
  const checkmateConfig = loadConfig();
  
  // Get API keys from CheckMate config
  const openaiKey = checkmateConfig.openai_key || 'your-openai-key-here';
  const anthropicKey = checkmateConfig.anthropic_key || 'your-anthropic-key-here';
  
  // Get model names from CheckMate config
  const reasonModel = checkmateConfig.models.reason;
  const quickModel = checkmateConfig.models.quick;
  
  // Determine which API keys to include based on model choices
  const envVars: Record<string, string> = {
    CHECKMATE_MODEL_REASON: reasonModel,
    CHECKMATE_MODEL_QUICK: quickModel
  };
  
  // Add OpenAI key if using GPT models
  if (reasonModel.includes('gpt') || quickModel.includes('gpt')) {
    envVars.OPENAI_API_KEY = openaiKey;
  }
  
  // Add Anthropic key if using Claude models
  if (reasonModel.includes('claude') || quickModel.includes('claude')) {
    envVars.ANTHROPIC_API_KEY = anthropicKey;
  }
  
  // Create MCP configuration
  const mcpConfig: MCPConfig = {
    mcpServers: {
      checkmate: {
        command: 'node',
        args: [
          'dist/mcp/index.js'
        ],
        env: envVars
      }
    }
  };
  
  // Check if config file already exists
  let existingConfig: MCPConfig = {};
  if (fs.existsSync(CURSOR_CONFIG_FILE)) {
    try {
      const configContent = fs.readFileSync(CURSOR_CONFIG_FILE, 'utf8');
      existingConfig = JSON.parse(configContent) as MCPConfig;
      console.log(chalk.yellow('⚠️ Existing Cursor config found, merging with new settings...'));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Error reading existing config: ${error}`));
      console.log(chalk.yellow('Creating new config file...'));
    }
  }
  
  // Merge with existing config
  const newConfig: MCPConfig = {
    ...existingConfig,
    mcpServers: {
      ...(existingConfig.mcpServers || {}),
      ...mcpConfig.mcpServers
    }
  };
  
  // Write the config file
  fs.writeFileSync(
    CURSOR_CONFIG_FILE,
    JSON.stringify(newConfig, null, 2),
    'utf8'
  );
  
  console.log(chalk.green(`✅ Updated ${CURSOR_CONFIG_FILE} with CheckMate MCP configuration`));
  
  // Display success message with info about used models
  printBox(`
🎉 CheckMate MCP Setup Complete!

${chalk.cyan(CURSOR_CONFIG_FILE)} has been configured for CheckMate.

Using models:
- Reasoning: ${chalk.green(reasonModel)}
- Quick checks: ${chalk.green(quickModel)}

${reasonModel.includes('claude') ? 
  chalk.yellow('⚠️ Using Claude model. Make sure your ANTHROPIC_API_KEY is set.') : ''}
${quickModel.includes('gpt') ? 
  chalk.yellow('⚠️ Using GPT model. Make sure your OPENAI_API_KEY is set.') : ''}

To use with Cursor:
1. Restart Cursor
2. Type ${chalk.cyan('"Build a todo list app"')} in a prompt
3. The MCP will generate specs and run checks automatically

Try ${chalk.cyan('npm run status')} to verify your AI configuration.
`);
}

// Run the setup
setupMcp(); 