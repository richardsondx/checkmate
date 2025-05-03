/**
 * Tree scanner for CheckMate CLI
 * Scans the project for relevant code files
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { load as loadConfig } from './config.js';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

// Path for snapshot file when git is not available
const SNAPSHOT_FILE = '.checkmate/snap.json';

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
export async function isGitInitialized(): Promise<boolean> {
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

/**
 * Interface for file snapshot data
 */
interface FileSnapshot {
  path: string;
  hash: string;
  mtime: number;
}

/**
 * Get changed files since the last snapshot or compared to Git base
 */
export async function getChangedFiles(gitBase?: string): Promise<string[]> {
  // Check if git is initialized
  const gitInitialized = await isGitInitialized();
  
  if (gitInitialized) {
    return getGitChangedFiles(gitBase);
  } else {
    return getFileSystemChangedFiles();
  }
}

/**
 * Get changed files using git diff
 */
async function getGitChangedFiles(base?: string): Promise<string[]> {
  try {
    // Use the provided base or default to HEAD
    const diffBase = base || 'HEAD';
    
    // Get changed files using git diff
    const command = `git diff --name-only ${diffBase}`;
    const output = await runCommand(command);
    
    // Add untracked files as well
    const untrackedCommand = 'git ls-files --others --exclude-standard';
    const untrackedOutput = await runCommand(untrackedCommand);
    
    // Combine changed and untracked files
    const changedFiles = output.split('\n').filter(Boolean);
    const untrackedFiles = untrackedOutput.split('\n').filter(Boolean);
    
    return [...new Set([...changedFiles, ...untrackedFiles])];
  } catch (error) {
    console.error('Error getting changed files from git:', error);
    return [];
  }
}

/**
 * Get changed files by comparing with a filesystem snapshot
 */
async function getFileSystemChangedFiles(): Promise<string[]> {
  try {
    // Make sure .checkmate directory exists
    if (!fs.existsSync('.checkmate')) {
      fs.mkdirSync('.checkmate', { recursive: true });
    }
    
    // Get current snapshot
    const currentSnapshot = await createFileSnapshot();
    
    // If no snapshot file exists, create it and return all files as changed
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      saveSnapshot(currentSnapshot);
      return currentSnapshot.map(file => file.path);
    }
    
    // Load previous snapshot
    const previousSnapshot = loadSnapshot();
    
    // Find changed files
    const changedFiles = findChangedFiles(previousSnapshot, currentSnapshot);
    
    // Update snapshot with current state
    saveSnapshot(currentSnapshot);
    
    return changedFiles;
  } catch (error) {
    console.error('Error getting changed files from snapshot:', error);
    return [];
  }
}

/**
 * Create a snapshot of all files in the project
 */
async function createFileSnapshot(): Promise<FileSnapshot[]> {
  // Get all files
  const files = await findFiles();
  
  // Create snapshot data
  const snapshot: FileSnapshot[] = [];
  
  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      const content = fs.readFileSync(file);
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      snapshot.push({
        path: file,
        hash,
        mtime: stats.mtimeMs
      });
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return snapshot;
}

/**
 * Find files that have changed between two snapshots
 */
function findChangedFiles(previous: FileSnapshot[], current: FileSnapshot[]): string[] {
  // Create maps for easier lookup
  const prevMap = new Map<string, FileSnapshot>();
  previous.forEach(file => prevMap.set(file.path, file));
  
  const changedFiles: string[] = [];
  
  // Check for changed or new files
  for (const file of current) {
    const prevFile = prevMap.get(file.path);
    
    // If file is new or has changed hash or mtime
    if (!prevFile || prevFile.hash !== file.hash || prevFile.mtime !== file.mtime) {
      changedFiles.push(file.path);
    }
    
    // Remove from map to track what's left (deleted files)
    prevMap.delete(file.path);
  }
  
  // Any files left in the map were deleted
  for (const [path] of prevMap) {
    changedFiles.push(path);
  }
  
  return changedFiles;
}

/**
 * Save snapshot to file
 */
function saveSnapshot(snapshot: FileSnapshot[]): void {
  try {
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving snapshot:', error);
  }
}

/**
 * Load snapshot from file
 */
function loadSnapshot(): FileSnapshot[] {
  try {
    const content = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading snapshot:', error);
    return [];
  }
} 