/**
 * Initialize CheckMate rules
 * Used to directly generate Cursor rule files
 */
import * as cursorRules from '../lib/cursorRules.js';
import { fileURLToPath } from 'url';

// Get the current module's path
const currentModulePath = fileURLToPath(import.meta.url);

// Check if this is the main module
const isMainModule = process.argv[1] === currentModulePath;

// If called directly from CLI, run the init command
if (isMainModule) {
  console.log('Initializing CheckMate rule files...');
  // Force regeneration of rule files
  cursorRules.generateAllRules(true);
}

export default function init() {
  console.log('Initializing CheckMate rule files...');
  cursorRules.generateAllRules(true);
} 