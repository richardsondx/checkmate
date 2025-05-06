/**
 * Spec indexer for CheckMate CLI
 * Scans and indexes all specs for the features command
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listSpecs, parseSpec } from './specs.js';
import { load as loadConfig } from './config.js';

// Directory where logs are stored
const LOGS_DIR = 'checkmate/logs';
// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';

// Default number of days after which a spec is considered stale
const DEFAULT_STALE_DAYS = 30;

// Interface for the feature data returned by the indexer
export interface Feature {
  slug: string;
  title: string;
  type: 'USER' | 'AGENT';
  status: 'PASS' | 'FAIL' | 'STALE' | 'UNKNOWN';
  fileCount: number;
  lastRun?: string;
  filePath: string;
}

/**
 * Index all specs in the project and return feature data
 */
export function indexSpecs(options: {
  type?: string;
  status?: string;
  search?: string;
} = {}): Feature[] {
  try {
    // Ensure the specs directory exists
    ensureSpecsDir();
    
    // Get all spec files
    const specFiles = listSpecs();
    
    // If no specs found, create placeholder examples for demonstration
    if (specFiles.length === 0) {
      return createPlaceholderFeatures();
    }
    
    // Get the config to determine stale days
    const config = loadConfig();
    // Use a custom property or default to 30 days
    const staleDays = (config as any).stale_days || DEFAULT_STALE_DAYS;
    
    // Get run log statuses for more efficient lookup
    const runLogStatuses = getRunLogStatuses();
    
    // Map to feature data
    const features: Feature[] = [];
    
    for (const specPath of specFiles) {
      try {
        const spec = parseSpec(specPath);
        const slug = path.basename(specPath, path.extname(specPath));
        
        // Check if this is an agent spec or user spec
        const isAgent = specPath.includes('specs/agents/') || spec.machine === true;
        
        // Get the status from log file or run log
        const status = getSpecStatus(slug, staleDays, runLogStatuses);
        
        // Create the feature data
        const feature: Feature = {
          slug,
          title: spec.title || slug,
          type: isAgent ? 'AGENT' : 'USER',
          status,
          fileCount: spec.files?.length || 0,
          filePath: specPath
        };
        
        // Get the last run time if available
        const lastRun = getLastRunTime(slug, runLogStatuses);
        if (lastRun) {
          feature.lastRun = lastRun;
        }
        
        // Apply filters if specified
        const shouldInclude = shouldIncludeFeature(feature, options);
        
        if (shouldInclude) {
          features.push(feature);
        }
      } catch (error) {
        console.error(`Error processing spec ${specPath}:`, error);
      }
    }
    
    // Sort by slug
    return features.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    console.error('Error indexing specs:', error);
    return createPlaceholderFeatures();
  }
}

/**
 * Create placeholder features for demonstration when no real specs are found
 */
function createPlaceholderFeatures(): Feature[] {
  return [
    {
      slug: 'add-todo',
      title: 'Add new todo item',
      type: 'USER',
      status: 'PASS',
      fileCount: 3,
      filePath: path.join(SPECS_DIR, 'add-todo.md')
    },
    {
      slug: 'auth-login',
      title: 'User login flow',
      type: 'AGENT',
      status: 'FAIL',
      fileCount: 4,
      filePath: path.join(SPECS_DIR, 'agents', 'auth-login.yaml')
    },
    {
      slug: 'billing-plan',
      title: 'Subscription billing upgrade',
      type: 'USER',
      status: 'STALE',
      fileCount: 2,
      filePath: path.join(SPECS_DIR, 'billing-plan.md')
    }
  ];
}

/**
 * Determine if a feature should be included based on filters
 */
function shouldIncludeFeature(feature: Feature, options: {
  type?: string;
  status?: string;
  search?: string;
}): boolean {
  // Type filter
  if (options.type) {
    // Case insensitive type comparison
    if (options.type.toUpperCase() !== feature.type) {
      return false;
    }
  }
  
  // Status filter
  if (options.status && options.status !== feature.status) {
    return false;
  }
  
  // Search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase();
    const titleMatch = feature.title.toLowerCase().includes(searchTerm);
    const slugMatch = feature.slug.toLowerCase().includes(searchTerm);
    
    if (!titleMatch && !slugMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the status of a spec from the log file or run log
 */
function getSpecStatus(
  slug: string, 
  staleDays: number,
  runLogStatuses: Record<string, { success: boolean; timestamp: string }>
): 'PASS' | 'FAIL' | 'STALE' | 'UNKNOWN' {
  try {
    // First check run log statuses which is more efficient
    if (runLogStatuses[slug]) {
      const { success, timestamp } = runLogStatuses[slug];
      
      // Check if it's stale
      const logDate = new Date(timestamp);
      const now = new Date();
      const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays > staleDays) {
        return 'STALE';
      }
      
      return success ? 'PASS' : 'FAIL';
    }
    
    // Fallback to individual log file
    const logPath = path.join(LOGS_DIR, `${slug}.log.json`);
    if (!fs.existsSync(logPath)) {
      return 'UNKNOWN';
    }
    
    // Read log file
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    
    // Check if there are any logs
    if (!logs || logs.length === 0) {
      return 'UNKNOWN';
    }
    
    // Get the latest log entry
    const latestLog = logs[0];
    
    // Check if it's stale
    const logDate = new Date(latestLog.timestamp);
    const now = new Date();
    const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > staleDays) {
      return 'STALE';
    }
    
    // Return pass/fail based on success flag
    return latestLog.success ? 'PASS' : 'FAIL';
  } catch (error) {
    return 'UNKNOWN';
  }
}

/**
 * Get the last run time for a spec
 */
function getLastRunTime(
  slug: string,
  runLogStatuses: Record<string, { success: boolean; timestamp: string }>
): string | undefined {
  try {
    // First check the run log statuses
    if (runLogStatuses[slug]) {
      return runLogStatuses[slug].timestamp;
    }
    
    // Fallback to individual log file
    const logPath = path.join(LOGS_DIR, `${slug}.log.json`);
    if (!fs.existsSync(logPath)) {
      return undefined;
    }
    
    // Read log file
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    
    // Check if there are any logs
    if (!logs || logs.length === 0) {
      return undefined;
    }
    
    // Return the timestamp of the latest log
    return logs[0].timestamp;
  } catch (error) {
    return undefined;
  }
}

/**
 * Get status for all specs from the latest run.log
 * This is more efficient than reading each individual log file
 */
export function getRunLogStatuses(): Record<string, { success: boolean; timestamp: string }> {
  try {
    const runLogPath = path.join(LOGS_DIR, 'run.log');
    if (!fs.existsSync(runLogPath)) {
      return {};
    }
    
    const content = fs.readFileSync(runLogPath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Process lines in reverse order to get the latest status for each spec
    const statuses: Record<string, { success: boolean; timestamp: string }> = {};
    
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const log = JSON.parse(lines[i]);
        if (!statuses[log.spec]) {
          statuses[log.spec] = {
            success: log.success,
            timestamp: log.timestamp
          };
        }
      } catch (error) {
        // Skip invalid JSON lines
      }
    }
    
    return statuses;
  } catch (error) {
    console.error('Error reading run log:', error);
    return {};
  }
}

/**
 * Ensure specs directory exists
 */
function ensureSpecsDir(): void {
  const specsPath = SPECS_DIR;
  const agentsPath = path.join(SPECS_DIR, 'agents');
  
  if (!fs.existsSync(specsPath)) {
    fs.mkdirSync(specsPath, { recursive: true });
  }
  
  if (!fs.existsSync(agentsPath)) {
    fs.mkdirSync(agentsPath, { recursive: true });
  }
  
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} 