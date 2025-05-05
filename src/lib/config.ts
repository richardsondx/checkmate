/**
 * Config handling for CheckMate CLI
 * Manages loading/saving of .checkmate configuration file
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';

// Type definitions for config
export interface CheckMateConfig {
  openai_key: string;
  anthropic_key: string;
  models: {
    reason: string;
    quick: string;
  };
  tree_cmd: string;
  log: 'on' | 'off' | 'optional';
  context_top_n: number;
  show_thinking: boolean;
  use_embeddings: boolean;
}

// Default configuration
const DEFAULT_CONFIG: CheckMateConfig = {
  openai_key: '',
  anthropic_key: '',
  models: {
    reason: 'claude-3-7-sonnet-20250219',
    quick: 'gpt-4o-mini',
  },
  tree_cmd: "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'",
  log: 'optional',
  context_top_n: 40,
  show_thinking: true,
  use_embeddings: true,
};

// Path to config file
const CONFIG_FILE = '.checkmate';

/**
 * Load configuration from .checkmate file
 * Returns default config if file doesn't exist
 */
export function load(): CheckMateConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      
      try {
        const parsedConfig = parse(fileContent);
        
        // Merge with defaults to ensure all fields exist
        return {
          ...DEFAULT_CONFIG,
          ...parsedConfig,
          models: {
            ...DEFAULT_CONFIG.models,
            ...(parsedConfig.models || {}),
          },
        };
      } catch (parseError) {
        console.error('Error parsing YAML config:', parseError);
        console.log('Using default configuration instead.');
        return { ...DEFAULT_CONFIG };
      }
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  // Return default config if file doesn't exist or can't be parsed
  return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to .checkmate file
 */
export function save(config: CheckMateConfig): void {
  try {
    const yamlStr = stringify(config);
    fs.writeFileSync(CONFIG_FILE, yamlStr, 'utf8');
  } catch (error) {
    console.error('Error saving config:', error);
    throw new Error(`Failed to save config: ${error}`);
  }
}

/**
 * Update a model in the configuration
 */
export function updateModel(slot: 'reason' | 'quick', modelName: string): CheckMateConfig {
  const config = load();
  config.models[slot] = modelName;
  save(config);
  return config;
}

/**
 * Set log mode
 */
export function setLogMode(mode: 'on' | 'off' | 'optional'): CheckMateConfig {
  const config = load();
  config.log = mode;
  save(config);
  return config;
}

/**
 * Ensure config file exists, create with defaults if it doesn't
 */
export function ensureConfigExists(): void {
  if (!fs.existsSync(CONFIG_FILE)) {
    save(DEFAULT_CONFIG);
    console.log(`Created default config file: ${CONFIG_FILE}`);
  }
} 