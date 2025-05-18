/**
 * Path utilities for CheckMate CLI
 * Provides consistent path resolution for accessing package scripts and resources
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the current file's directory to determine package path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Get absolute path to a script in the scripts directory
 * @param scriptName Name of the script file
 * @returns Absolute path to the script
 */
export function getScriptPath(scriptName: string): string {
  return path.join(PACKAGE_ROOT, 'scripts', scriptName);
}

/**
 * Get absolute path to a file in the package
 * @param relativePath Path relative to package root
 * @returns Absolute path to the file
 */
export function getPackagePath(relativePath: string): string {
  return path.join(PACKAGE_ROOT, relativePath);
} 