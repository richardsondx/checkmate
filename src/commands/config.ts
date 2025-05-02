/**
 * Config-related commands for CheckMate CLI
 */
import { printBox } from '../ui/banner.js';
import * as config from '../lib/config.js';

/**
 * Initialize configuration
 */
export function init(): void {
  config.ensureConfigExists();
  printBox('CheckMate config initialized at .checkmate');
}

/**
 * Show current configuration
 */
export function show(): void {
  const currentConfig = config.load();
  console.log('Current configuration:');
  console.log(JSON.stringify(currentConfig, null, 2));
}

/**
 * Set model for a specific slot
 */
export function setModel(slot: 'reason' | 'quick', modelName: string): void {
  config.updateModel(slot, modelName);
  printBox(`Model for ${slot} set to ${modelName}`);
}

/**
 * Set log mode
 */
export function setLogMode(mode: 'on' | 'off' | 'optional'): void {
  config.setLogMode(mode);
  printBox(`Log mode set to ${mode}`);
} 