/**
 * Specification snapshot manager
 * Handles creating and managing snapshots of specification files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';

// Default snapshot file path
const DEFAULT_SNAPSHOT_PATH = 'checkmate/specs/spec-snapshot.json';

/**
 * Interface for spec snapshot entry
 */
interface SpecSnapshot {
  hash: string;
  mtime: number;
  slug: string;
}

/**
 * Interface for the snapshot file format
 */
interface SnapshotFile {
  timestamp: number;
  specs: Record<string, SpecSnapshot>;
}

/**
 * Extended config interface with snapshot and spec directory settings
 */
interface ExtendedConfig {
  spec_dir?: string;
  spec_snapshot_path?: string;
}

/**
 * Create a snapshot of all specification files
 * @param specDir The directory containing specification files
 * @returns The path to the created snapshot file
 */
export function createSnapshot(specDir?: string): string {
  // Get the spec directory from config if not provided
  const config = loadConfig() as unknown as ExtendedConfig;
  const specsDirectory = specDir || config.spec_dir || 'checkmate/specs';
  
  // Get the snapshot path from config or use default
  const snapshotPath = config.spec_snapshot_path || DEFAULT_SNAPSHOT_PATH;
  
  // Ensure the directory exists
  const snapshotDir = path.dirname(snapshotPath);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
  
  // Find all specification files
  const specFiles = findSpecFiles(specsDirectory);
  
  // Create snapshot data
  const snapshot: SnapshotFile = {
    timestamp: Date.now(),
    specs: {}
  };
  
  // Process each spec file
  for (const specFile of specFiles) {
    try {
      const relativePath = path.relative(specsDirectory, specFile);
      const stats = fs.statSync(specFile);
      const content = fs.readFileSync(specFile, 'utf8');
      const hash = hashString(content);
      const slug = path.basename(specFile, path.extname(specFile));
      
      snapshot.specs[relativePath] = {
        hash,
        mtime: stats.mtimeMs,
        slug
      };
    } catch (error) {
      // Skip files that can't be read
      console.error(`Error processing spec file ${specFile}:`, error);
    }
  }
  
  // Save the snapshot
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  
  return snapshotPath;
}

/**
 * Find all specification files in a directory
 * @param dir The directory to search in
 * @returns Array of file paths
 */
function findSpecFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const result: string[] = [];
  
  function readDirRecursively(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        readDirRecursively(fullPath);
      } else if (entry.isFile() && (
        entry.name.endsWith('.md') || 
        entry.name.endsWith('.yaml') || 
        entry.name.endsWith('.yml')
      )) {
        result.push(fullPath);
      }
    }
  }
  
  readDirRecursively(dir);
  return result;
}

/**
 * Simple string hashing function
 * @param str String to hash
 * @returns Hash as string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Load a snapshot file
 * @param snapshotPath Path to the snapshot file
 * @returns The loaded snapshot data or null if not found
 */
export function loadSnapshot(snapshotPath?: string): SnapshotFile | null {
  // Get the snapshot path from config if not provided
  const config = loadConfig() as unknown as ExtendedConfig;
  const finalSnapshotPath = snapshotPath || config.spec_snapshot_path || DEFAULT_SNAPSHOT_PATH;
  
  if (!fs.existsSync(finalSnapshotPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(finalSnapshotPath, 'utf8');
    return JSON.parse(content) as SnapshotFile;
  } catch (error) {
    console.error(`Error loading snapshot from ${finalSnapshotPath}:`, error);
    return null;
  }
}

/**
 * Compare current specs against a snapshot
 * @param specDir The directory containing specification files
 * @param snapshotPath Path to the snapshot file
 * @returns Object with added, modified, and removed specs
 */
export function compareWithSnapshot(specDir?: string, snapshotPath?: string): {
  added: string[];
  modified: string[];
  removed: string[];
} {
  // Get the spec directory from config if not provided
  const config = loadConfig() as unknown as ExtendedConfig;
  const specsDirectory = specDir || config.spec_dir || 'checkmate/specs';
  
  // Get the snapshot path from config if not provided
  const finalSnapshotPath = snapshotPath || config.spec_snapshot_path || DEFAULT_SNAPSHOT_PATH;
  
  // If snapshot doesn't exist, all specs are considered new
  const snapshot = loadSnapshot(finalSnapshotPath);
  if (!snapshot) {
    const currentSpecs = findSpecFiles(specsDirectory).map(file => 
      path.relative(specsDirectory, file)
    );
    return {
      added: currentSpecs,
      modified: [],
      removed: []
    };
  }
  
  // Find current specs
  const currentSpecPaths = findSpecFiles(specsDirectory);
  const currentSpecs = new Map<string, { hash: string, mtime: number }>();
  
  // Process each spec file
  for (const specFile of currentSpecPaths) {
    try {
      const relativePath = path.relative(specsDirectory, specFile);
      const stats = fs.statSync(specFile);
      const content = fs.readFileSync(specFile, 'utf8');
      const hash = hashString(content);
      
      currentSpecs.set(relativePath, {
        hash,
        mtime: stats.mtimeMs
      });
    } catch (error) {
      // Skip files that can't be read
      console.error(`Error processing spec file ${specFile}:`, error);
    }
  }
  
  // Compare current specs with snapshot
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  
  // Find added and modified specs
  for (const [relativePath, { hash }] of currentSpecs.entries()) {
    if (!snapshot.specs[relativePath]) {
      added.push(relativePath);
    } else if (snapshot.specs[relativePath].hash !== hash) {
      modified.push(relativePath);
    }
  }
  
  // Find removed specs
  for (const relativePath in snapshot.specs) {
    if (!currentSpecs.has(relativePath)) {
      removed.push(relativePath);
    }
  }
  
  return { added, modified, removed };
} 