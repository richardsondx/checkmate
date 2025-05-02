/**
 * Tree scanner for CheckMate CLI
 * Scans the project for relevant code files
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { load as loadConfig } from './config.js';

const execAsync = promisify(exec);

/**
 * Run a shell command and return stdout
 */
async function runCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, { shell: '/bin/bash' });
    if (stderr) {
      console.error('Command stderr:', stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error('Error running command:', error);
    return '';
  }
}

/**
 * Check if git is initialized in the current directory
 */
async function isGitInitialized(): Promise<boolean> {
  try {
    await execAsync('git rev-parse --is-inside-work-tree');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of files using git ls-files
 */
async function getGitFiles(): Promise<string[]> {
  try {
    // Get all files tracked by git
    const output = await runCommand('git ls-files');
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting git files:', error);
    return [];
  }
}

/**
 * Get list of files using default find command (fallback)
 * Used when git is not initialized
 */
async function findFiles(): Promise<string[]> {
  // Use find command to list all files, excluding node_modules and hidden directories
  const command = "find . -type f -not -path '*/node_modules/*' -not -path '*/\\.*/*'";
  const output = await runCommand(command);
  return output.split('\n').filter(Boolean);
}

/**
 * Filter file paths by extensions
 */
function filterByExtension(files: string[], extensions: string[]): string[] {
  const extSet = new Set(extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`));
  return files.filter(file => {
    const ext = path.extname(file);
    return extSet.has(ext);
  });
}

/**
 * Scan the project for relevant code files
 * Uses the tree_cmd from config or falls back to defaults
 */
export async function scan(extensions: string[] = ['ts', 'js', 'tsx', 'jsx']): Promise<string[]> {
  // Check if git is initialized
  const gitInitialized = await isGitInitialized();
  
  // Get all files (either via git or find)
  const files = gitInitialized ? await getGitFiles() : await findFiles();
  
  // Filter by extension
  return filterByExtension(files, extensions);
}

/**
 * Get files by glob pattern
 */
export async function getFilesByGlob(globPattern: string): Promise<string[]> {
  // Use glob library via the shell for simplicity
  const command = `find . -type f -path "${globPattern}" -not -path "*/node_modules/*" -not -path "*/\\.*/*"`;
  const output = await runCommand(command);
  return output.split('\n').filter(Boolean);
}

/**
 * Get file paths relative to the project root
 */
export function getRelativePaths(files: string[]): string[] {
  return files.map(file => {
    // Remove './' prefix if it exists
    return file.startsWith('./') ? file.substring(2) : file;
  });
}

/**
 * Get just the directory part from a set of file paths
 */
export function getDirectories(files: string[]): string[] {
  const dirs = new Set<string>();
  
  for (const file of files) {
    const dir = path.dirname(file);
    if (dir !== '.') {
      dirs.add(dir);
    }
  }
  
  return Array.from(dirs);
} 