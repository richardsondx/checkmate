/**
 * Rename detector for CheckMate CLI
 * Detects file renames by comparing file content hashes
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'crypto';

// Path for snapshot file when git is not available
const SNAPSHOT_FILE = '.checkmate/snap.json';
const RENAME_MAP_FILE = '.checkmate/rename-map.json';

/**
 * Interface for file snapshot data
 */
interface FileSnapshot {
  path: string;
  hash: string;
  mtime: number;
  basename?: string;
}

/**
 * Interface for rename mapping
 */
interface RenameMap {
  oldPath: string;
  newPath: string;
  confidence: number;
  timestamp: number;
}

/**
 * Detect and record renames by comparing current files with previous snapshot
 */
export async function detectRenames(): Promise<RenameMap[]> {
  // Ensure snapshot directory exists
  if (!fs.existsSync('.checkmate')) {
    fs.mkdirSync('.checkmate', { recursive: true });
  }
  
  // If no snapshot file exists, we can't detect renames
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return [];
  }
  
  // Load previous snapshot
  const previousSnapshot = loadSnapshot();
  
  // Create current snapshot
  const currentSnapshot = await createFileSnapshot();
  
  // Find renames
  const renames = findRenamedFiles(previousSnapshot, currentSnapshot);
  
  // Save rename map
  saveRenameMap(renames);
  
  // Save current snapshot
  saveSnapshot(currentSnapshot);
  
  return renames;
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
      const basename = path.basename(file);
      
      snapshot.push({
        path: file,
        hash,
        mtime: stats.mtimeMs,
        basename
      });
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return snapshot;
}

/**
 * Find files that have been renamed between snapshots
 */
function findRenamedFiles(previous: FileSnapshot[], current: FileSnapshot[]): RenameMap[] {
  // Create maps for easier lookup
  const prevPathMap = new Map<string, FileSnapshot>();
  const prevHashMap = new Map<string, FileSnapshot[]>();
  const prevBasenameMap = new Map<string, FileSnapshot[]>();
  
  // Index previous snapshot by path, hash, and basename
  previous.forEach(file => {
    prevPathMap.set(file.path, file);
    
    // Group by hash
    if (!prevHashMap.has(file.hash)) {
      prevHashMap.set(file.hash, []);
    }
    prevHashMap.get(file.hash)!.push(file);
    
    // Group by basename
    if (file.basename) {
      if (!prevBasenameMap.has(file.basename)) {
        prevBasenameMap.set(file.basename, []);
      }
      prevBasenameMap.get(file.basename)!.push(file);
    }
  });
  
  // Current paths map for quick lookup
  const currentPaths = new Set<string>();
  current.forEach(file => currentPaths.add(file.path));
  
  // Find candidates for renames
  const renames: RenameMap[] = [];
  
  // Process each current file
  for (const file of current) {
    // Skip if the file already existed in previous snapshot
    if (prevPathMap.has(file.path)) {
      continue;
    }
    
    // Look for files with the same hash in the previous snapshot
    const sameHashFiles = prevHashMap.get(file.hash) || [];
    
    // Look for files with the same basename in the previous snapshot
    const sameBasenameFiles = prevBasenameMap.get(file.basename || '') || [];
    
    // Find the best rename candidate
    let bestCandidate: FileSnapshot | null = null;
    let bestConfidence = 0;
    
    // Check files with same hash
    for (const prevFile of sameHashFiles) {
      // If old path is missing from current snapshot, it's a candidate
      if (!currentPaths.has(prevFile.path)) {
        // Same hash is a very strong indicator (0.9 confidence)
        const confidence = 0.9;
        
        // If same basename too, even stronger indicator
        const sameBasename = file.basename && file.basename === prevFile.basename;
        const totalConfidence = sameBasename ? 0.95 : confidence;
        
        if (totalConfidence > bestConfidence) {
          bestCandidate = prevFile;
          bestConfidence = totalConfidence;
        }
      }
    }
    
    // If no high-confidence match, check files with same basename
    if (bestConfidence < 0.5 && file.basename) {
      for (const prevFile of sameBasenameFiles) {
        // If old path is missing from current snapshot, it's a candidate
        if (!currentPaths.has(prevFile.path)) {
          // Same basename is a moderate indicator (0.6 confidence)
          const confidence = 0.6;
          
          if (confidence > bestConfidence) {
            bestCandidate = prevFile;
            bestConfidence = confidence;
          }
        }
      }
    }
    
    // If we found a good candidate, record it as a rename
    if (bestCandidate && bestConfidence >= 0.6) {
      renames.push({
        oldPath: bestCandidate.path,
        newPath: file.path,
        confidence: bestConfidence,
        timestamp: Date.now()
      });
    }
  }
  
  return renames;
}

/**
 * Get all files in the project
 */
async function findFiles(): Promise<string[]> {
  // Use readdir recursively, excluding node_modules and hidden directories
  const result: string[] = [];
  
  function readDirRecursively(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip node_modules and hidden directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        readDirRecursively(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  
  readDirRecursively('.');
  return result;
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
 * Load rename map from file
 */
export function loadRenameMap(): RenameMap[] {
  try {
    if (!fs.existsSync(RENAME_MAP_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(RENAME_MAP_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading rename map:', error);
    return [];
  }
}

/**
 * Save rename map to file
 */
function saveRenameMap(renames: RenameMap[]): void {
  try {
    // Load existing rename map
    const existingMap = loadRenameMap();
    
    // Merge new renames with existing ones (keeping the most recent 1000)
    const allRenames = [...renames, ...existingMap]
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp, descending
      .slice(0, 1000); // Keep only the 1000 most recent
    
    fs.writeFileSync(RENAME_MAP_FILE, JSON.stringify(allRenames, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving rename map:', error);
  }
}

/**
 * Get the new path for a file if it has been renamed
 */
export function getNewPathIfRenamed(oldPath: string): string | null {
  const renameMap = loadRenameMap();
  
  // Look for the old path in the rename map
  const rename = renameMap.find(r => r.oldPath === oldPath);
  
  if (rename) {
    return rename.newPath;
  }
  
  return null;
}

/**
 * Get the old path for a file if it is a renamed file
 */
export function getOldPathIfRenamed(newPath: string): string | null {
  const renameMap = loadRenameMap();
  
  // Look for the new path in the rename map
  const rename = renameMap.find(r => r.newPath === newPath);
  
  if (rename) {
    return rename.oldPath;
  }
  
  return null;
}

/**
 * Update references to renamed files in a specification file
 */
export function updateRenamedFilesInSpec(specPath: string, autoApply: boolean = false): { updated: boolean, changes: { from: string, to: string }[] } {
  try {
    if (!fs.existsSync(specPath)) {
      return { updated: false, changes: [] };
    }
    
    const specContent = fs.readFileSync(specPath, 'utf8');
    const renameMap = loadRenameMap();
    const changes: { from: string, to: string }[] = [];
    
    if (renameMap.length === 0) {
      return { updated: false, changes: [] };
    }
    
    let updatedContent = specContent;
    
    // For each rename, update file references in the spec
    for (const rename of renameMap) {
      // Only consider high-confidence renames
      if (rename.confidence >= 0.9) {
        const oldPathRegex = new RegExp(escapeRegExp(rename.oldPath), 'g');
        if (specContent.match(oldPathRegex)) {
          updatedContent = updatedContent.replace(oldPathRegex, rename.newPath);
          changes.push({ from: rename.oldPath, to: rename.newPath });
        }
      }
    }
    
    // If changes were made and autoApply is true, save the updated spec
    if (changes.length > 0 && autoApply) {
      fs.writeFileSync(specPath, updatedContent, 'utf8');
    }
    
    return { updated: changes.length > 0, changes };
  } catch (error) {
    console.error('Error updating renamed files in spec:', error);
    return { updated: false, changes: [] };
  }
}

/**
 * Utility function to escape special characters in a string for use in a regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect and automatically apply renames in all spec files
 */
export function repairAllSpecs(autoApply: boolean = false): { updated: string[], skipped: string[] } {
  try {
    const specsDir = 'checkmate/specs';
    if (!fs.existsSync(specsDir)) {
      return { updated: [], skipped: [] };
    }
    
    const updated: string[] = [];
    const skipped: string[] = [];
    
    // Find all spec files
    function findSpecFiles(dir: string): string[] {
      const result: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          result.push(...findSpecFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
          result.push(fullPath);
        }
      }
      
      return result;
    }
    
    const specFiles = findSpecFiles(specsDir);
    
    // Update each spec file
    for (const specPath of specFiles) {
      const { updated: wasUpdated } = updateRenamedFilesInSpec(specPath, autoApply);
      
      if (wasUpdated) {
        updated.push(specPath);
      } else {
        skipped.push(specPath);
      }
    }
    
    return { updated, skipped };
  } catch (error) {
    console.error('Error repairing specs:', error);
    return { updated: [], skipped: [] };
  }
} 