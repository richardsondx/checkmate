/**
 * Telemetry module for CheckMate
 * Tracks token usage and cost per project/session
 */
import fs from 'fs';
import path from 'path';
import { load } from './config.js';

// Interface for telemetry entry
interface TelemetryEntry {
  ts: string;
  cmd: string;
  provider: string;
  model: string;
  in: number;
  out: number;
  ms?: number;
  estimated?: boolean;
}

// Interface for usage summary
interface UsageSummary {
  tokens: number;
  cost: number;
  estimatedTokens: number;
  byModel: Record<string, {
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    isEstimated: boolean;
  }>;
}

// Default pricing per 1K tokens (if not in config)
const DEFAULT_PRICING: Record<string, number> = {
  'openai/gpt-4o': 0.01,
  'openai/gpt-4o-mini': 0.005,
  'anthropic/claude-3-opus': 0.015,
  'anthropic/claude-3-sonnet': 0.008,
  'anthropic/claude-3-haiku': 0.00025,
};

// Current session data
let current: { id: string; cmd: string } = { id: '', cmd: '' };
let telemetryFolder = '';
let currentFile = '';
let inCI = process.env.CI === 'true';

/**
 * Initialize telemetry for a new session
 * @param cmd The command being executed
 */
export function startSession(cmd: string): void {
  current = { id: Date.now().toString(36), cmd };
  
  // Create telemetry directory if it doesn't exist
  try {
    const config = load();
    
    // Skip if logging is disabled
    if (config.log === 'off') return;
    
    telemetryFolder = path.join(process.cwd(), '.checkmate-telemetry');
    fs.mkdirSync(telemetryFolder, { recursive: true });
    
    // Create new session file
    currentFile = path.join(telemetryFolder, `${current.id}.jsonl`);
    
    // Record session start
    const entry: TelemetryEntry = {
      ts: new Date().toISOString(),
      cmd,
      provider: 'system',
      model: 'session-start',
      in: 0,
      out: 0
    };
    
    write(JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
  }
}

/**
 * Get the current session information
 * @returns Current session data or undefined if not initialized
 */
export function getCurrentSession(): { id: string; cmd: string } | undefined {
  return current.id ? current : undefined;
}

/**
 * Record a telemetry entry
 * @param entry The telemetry entry to record
 */
export function record(entry: {
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  ms?: number;
  estimated?: boolean;
}): void {
  // Skip if logging is disabled or not initialized
  if (!currentFile) return;
  
  try {
    const formattedEntry: TelemetryEntry = {
      ts: new Date().toISOString(),
      cmd: current.cmd,
      provider: entry.provider,
      model: entry.model,
      in: entry.tokensIn,
      out: entry.tokensOut,
      ms: entry.ms,
      estimated: entry.estimated
    };
    
    write(JSON.stringify(formattedEntry) + '\n');
  } catch (error) {
    // Fail silently - telemetry should never break the main app
  }
}

/**
 * Extract token usage from model response
 * @param response The model response object
 * @returns Token usage data
 */
export function pickUsage(response: any): { prompt: number; completion: number; estimated: boolean } {
  // Default to estimated values
  let estimated = true;
  let prompt = 0;
  let completion = 0;
  
  try {
    // OpenAI format
    if (response?.usage?.prompt_tokens && response?.usage?.completion_tokens) {
      prompt = response.usage.prompt_tokens;
      completion = response.usage.completion_tokens;
      estimated = false;
    }
    // Anthropic Claude 3 format
    else if (response?.usage?.input_tokens && response?.usage?.output_tokens) {
      prompt = response.usage.input_tokens;
      completion = response.usage.output_tokens;
      estimated = false;
    }
    // Fallback to estimation based on text length
    else if (response) {
      // Estimate based on text length (roughly 4 chars per token)
      if (response.prompt) prompt = Math.ceil(response.prompt.length / 4);
      if (response.content || response.text) {
        const text = response.content || response.text;
        completion = Math.ceil(text.length / 4);
      }
    }
  } catch (error) {
    // Fallback to zero if extraction fails
  }
  
  return { prompt, completion, estimated };
}

/**
 * Write data to the telemetry file
 * @param data The data to write
 */
function write(data: string): void {
  try {
    // Append to the current session file if it exists
    if (currentFile) {
      fs.appendFileSync(currentFile, data);
      
      // Check file size and roll over if necessary (>5MB)
      const stats = fs.statSync(currentFile);
      if (stats.size > 5 * 1024 * 1024) {
        currentFile = path.join(telemetryFolder, `${current.id}-${Date.now().toString(36)}.jsonl`);
      }
    }
  } catch (error) {
    // Silently fail - telemetry should not break the app
  }
}

/**
 * Get pricing for a model
 * @param provider Provider name
 * @param model Model name
 * @returns Price per 1K tokens
 */
export function getPricing(provider: string, model: string): number {
  const config = load();
  const key = `${provider}/${model}`;
  
  // Check in config
  if (config.pricing && config.pricing[key]) {
    return config.pricing[key];
  }
  
  // Fall back to defaults
  return DEFAULT_PRICING[key] || 0.01; // Default to $0.01 per 1K if unknown
}

/**
 * Get a summary of telemetry data
 * @param filePath Optional specific session file to summarize
 * @param forceMostRecent Force to fetch the most recent session
 * @returns Usage summary
 */
export function summary(filePath?: string, forceMostRecent: boolean = false): UsageSummary {
  // If no file is specified and currentFile isn't set, use the most recent file
  let sessionFile = filePath;

  // Determine if we should fetch the most recent session
  // This is true if forceMostRecent is set, or if no filePath is given AND
  // (currentFile is not set OR the current command is 'stats')
  const shouldFetchMostRecent = forceMostRecent || 
    (!sessionFile && (!currentFile || (current && current.cmd === 'stats')));

  if (shouldFetchMostRecent) {
    try {
      const folderPath = telemetryFolder || path.join(process.cwd(), '.checkmate-telemetry');
      if (fs.existsSync(folderPath)) {
        // Get the most recent jsonl file
        let files = fs.readdirSync(folderPath)
          .filter(file => file.endsWith('.jsonl'))
          .map(file => ({
            name: file,
            time: fs.statSync(path.join(folderPath, file)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time);
        
        // If the current command is 'stats' and we have multiple files,
        // try to exclude the current 'stats' session file to get the *actual* last work session.
        if (current && current.cmd === 'stats' && files.length > 1) {
          const statsSessionFileName = `${current.id}.jsonl`;
          const filteredFiles = files.filter(file => file.name !== statsSessionFileName);
          if (filteredFiles.length > 0) {
            files = filteredFiles; // Use the filtered list if it's not empty
          }
        }
        
        if (files.length > 0) {
          sessionFile = path.join(folderPath, files[0].name);
        } else if (currentFile && current && current.cmd === 'stats') {
          // Fallback to the current 'stats' session file if no other files exist at all
          // (e.g. stats is the very first command run)
          sessionFile = currentFile;
        } else {
          // If no files found and it's not the stats command, or currentFile is not set
          // then sessionFile remains undefined, and the function will return an empty summary.
        }
      }
    } catch (e) {
      // Silently continue if error
    }
  } else {
    sessionFile = sessionFile || currentFile;
  }
  
  const result: UsageSummary = {
    tokens: 0,
    cost: 0,
    estimatedTokens: 0,
    byModel: {}
  };
  
  try {
    if (!sessionFile || !fs.existsSync(sessionFile)) {
      return result;
    }
    
    const lines = fs.readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean);
    
    for (const line of lines) {
      try {
        const entry: TelemetryEntry = JSON.parse(line);
        
        // Skip session start entries
        if (entry.provider === 'system') continue;
        
        const totalTokens = entry.in + entry.out;
        const modelKey = `${entry.provider}/${entry.model}`;
        
        // Initialize model entry if it doesn't exist
        if (!result.byModel[modelKey]) {
          result.byModel[modelKey] = {
            tokens: { input: 0, output: 0, total: 0 },
            cost: 0,
            isEstimated: false
          };
        }
        
        // Update totals
        result.tokens += totalTokens;
        if (entry.estimated) {
          result.estimatedTokens += totalTokens;
          result.byModel[modelKey].isEstimated = true;
        }
        
        // Update model-specific data
        result.byModel[modelKey].tokens.input += entry.in;
        result.byModel[modelKey].tokens.output += entry.out;
        result.byModel[modelKey].tokens.total += totalTokens;
        
        // Calculate cost
        const price = getPricing(entry.provider, entry.model);
        const tokenCost = (totalTokens / 1000) * price;
        result.cost += tokenCost;
        result.byModel[modelKey].cost += tokenCost;
      } catch (error) {
        // Skip invalid entries
      }
    }
  } catch (error) {
    // Return empty summary on error
  }
  
  return result;
}

/**
 * Get a summary of all sessions
 * @param options Options for filtering sessions
 * @returns Usage summary
 */
export function getAllSessionsSummary(options: { 
  since?: string; 
  sessionId?: string;
}): UsageSummary {
  const result: UsageSummary = {
    tokens: 0,
    cost: 0,
    estimatedTokens: 0,
    byModel: {}
  };
  
  try {
    // Make sure we have a telemetry folder path even if it wasn't initialized yet
    const folderPath = telemetryFolder || path.join(process.cwd(), '.checkmate-telemetry');
    
    if (!fs.existsSync(folderPath)) {
      return result;
    }
    
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.jsonl'))
      .filter(file => {
        // Filter by session ID if provided
        if (options.sessionId) {
          return file.startsWith(options.sessionId);
        }
        
        // Filter by time if provided
        if (options.since) {
          const stats = fs.statSync(path.join(folderPath, file));
          const fileTime = new Date(stats.mtime).getTime();
          const sinceTime = new Date().getTime() - parseTimeFilter(options.since);
          return fileTime >= sinceTime;
        }
        
        return true;
      })
      .map(file => path.join(folderPath, file));
    
    // Merge summaries from all files
    for (const file of files) {
      const fileSummary = summary(file);
      result.tokens += fileSummary.tokens;
      result.cost += fileSummary.cost;
      result.estimatedTokens += fileSummary.estimatedTokens;
      
      // Merge by model data
      for (const [modelKey, modelData] of Object.entries(fileSummary.byModel)) {
        if (!result.byModel[modelKey]) {
          result.byModel[modelKey] = {
            tokens: { input: 0, output: 0, total: 0 },
            cost: 0,
            isEstimated: false
          };
        }
        
        result.byModel[modelKey].tokens.input += modelData.tokens.input;
        result.byModel[modelKey].tokens.output += modelData.tokens.output;
        result.byModel[modelKey].tokens.total += modelData.tokens.total;
        result.byModel[modelKey].cost += modelData.cost;
        result.byModel[modelKey].isEstimated = result.byModel[modelKey].isEstimated || modelData.isEstimated;
      }
    }
  } catch (error) {
    // Return current summary on error
    console.error('Error getting all sessions summary:', error);
  }
  
  return result;
}

/**
 * Parse a time filter string into milliseconds
 * @param timeFilter Time filter string (e.g., "24h", "7d")
 * @returns Time in milliseconds
 */
export function parseTimeFilter(timeFilter: string): number {
  const match = timeFilter.match(/^(\d+)([hdwm])$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default to 24h
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  switch (unit) {
    case 'h': return numValue * 60 * 60 * 1000; // hours
    case 'd': return numValue * 24 * 60 * 60 * 1000; // days
    case 'w': return numValue * 7 * 24 * 60 * 60 * 1000; // weeks
    case 'm': return numValue * 30 * 24 * 60 * 60 * 1000; // months (approximate)
    default: return 24 * 60 * 60 * 1000; // Default to 24h
  }
} 