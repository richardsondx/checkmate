/**
 * Watch command for CheckMate CLI
 * Creates a live dashboard that tails the run.log file
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import chalk from 'chalk';
import chokidar from 'chokidar';
import * as telemetry from '../lib/telemetry.js';

// Directory for logs
const LOGS_DIR = 'checkmate/logs';

// Log file to watch
const RUN_LOG_FILE = path.join(LOGS_DIR, 'run.log');

// Interface for log entry
interface LogEntry {
  timestamp: string;
  spec: string;
  success: boolean;
  total: number;
  passed: number;
  requirements: Array<{text: string; status: boolean}>;
}

// Interface for watch options
interface WatchOptions {
  filter?: string;
  typeFilter?: string;
  statusFilter?: string;
  limit?: number;
  spec?: string;
  untilPass?: boolean;
}

/**
 * Parse a log line into a structured log entry
 */
function parseLogLine(line: string): LogEntry | null {
  try {
    return JSON.parse(line) as LogEntry;
  } catch (error) {
    console.error('Error parsing log line:', error);
    return null;
  }
}

/**
 * Format a timestamp for display with leading zeros and uppercase AM/PM
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    
    // Format hours with leading zero
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const formattedHours = hours.toString().padStart(2, '0');
    
    // Format minutes and seconds with leading zeros
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
  } catch (error) {
    return timestamp;
  }
}

/**
 * Create a header for the dashboard
 */
function renderHeader(): string {
  return [
    chalk.bold('Time'.padEnd(10)),
    chalk.bold('Spec'.padEnd(40)),
    chalk.bold('Type'.padEnd(8)),
    chalk.bold('Total'.padEnd(8)),
    chalk.bold('Status'.padEnd(10)),
    chalk.bold('Pass'.padEnd(10)),
    chalk.bold('Fail'.padEnd(10)),
  ].join('  ');
}

/**
 * Render a separator line
 */
function renderSeparator(): string {
  return chalk.gray('─'.repeat(130));
}

/**
 * Determine if a spec is an agent spec or a user spec
 * Agent specs typically have specific patterns in their names
 */
function determineSpecType(specName: string): string {
  const agentPatterns = [
    'spec-',                  // starts with spec-
    'mcp-',                   // starts with mcp-
    'spec-generation',        // contains spec-generation
    'spec-runner',            // contains spec-runner
    '-generation-feature',    // ends with -generation-feature
    'markdown-generation'     // contains markdown-generation
  ];
  
  // Check if the spec name matches any agent pattern
  for (const pattern of agentPatterns) {
    if (specName.includes(pattern)) {
      return 'agent';
    }
  }
  
  return 'user';
}

/**
 * Render a log entry as a row
 */
function renderRow(entry: LogEntry): string {
  const time = formatTimestamp(entry.timestamp).padEnd(10);
  
  // Truncate the spec name if it's too long
  const maxSpecLength = 35; // Allow space for ellipsis
  const spec = entry.spec.length > maxSpecLength
    ? entry.spec.substring(0, maxSpecLength) + '...'
    : entry.spec;
  const specPadded = spec.padEnd(40);
  
  // Determine and format spec type
  const type = determineSpecType(entry.spec);
  const typeFormatted = type === 'agent'
    ? chalk.blue('AGENT'.padEnd(8))
    : chalk.yellow('USER'.padEnd(8));
  
  // Add total column
  const totalFormatted = chalk.cyan(entry.total.toString().padEnd(8));
  
  const status = entry.success 
    ? chalk.green('PASS'.padEnd(10)) 
    : chalk.red('FAIL'.padEnd(10));
  const passed = chalk.green(entry.passed.toString().padEnd(10));
  const failed = chalk.red((entry.total - entry.passed).toString().padEnd(10));

  return [time, specPadded, typeFormatted, totalFormatted, status, passed, failed].join('  ');
}

/**
 * Apply filters to log entries
 */
function applyFilters(entries: LogEntry[], options: WatchOptions): {filteredEntries: LogEntry[], activeFilters: string[]} {
  let filteredEntries = [...entries];
  const activeFilters: string[] = [];

  // Apply name filter if provided
  if (options.filter && options.filter.trim()) {
    const filterText = options.filter.trim().toLowerCase();
    filteredEntries = filteredEntries.filter(entry => 
      entry.spec.toLowerCase().includes(filterText)
    );
    activeFilters.push(`name containing "${options.filter}"`);
  }

  // Apply specific spec filter if provided
  if (options.spec && options.spec.trim()) {
    const specName = options.spec.trim().toLowerCase();
    filteredEntries = filteredEntries.filter(entry => 
      entry.spec.toLowerCase() === specName.toLowerCase()
    );
    activeFilters.push(`spec "${options.spec}"`);
  }
  
  // Apply type filter if provided
  if (options.typeFilter) {
    const type = options.typeFilter.toUpperCase();
    filteredEntries = filteredEntries.filter(entry => 
      determineSpecType(entry.spec).toUpperCase() === type
    );
    activeFilters.push(`type = ${type}`);
  }
  
  // Apply status filter if provided
  if (options.statusFilter) {
    const status = options.statusFilter.toUpperCase();
    filteredEntries = filteredEntries.filter(entry => 
      entry.success === (status === 'PASS')
    );
    activeFilters.push(`status = ${status}`);
  }

  return { filteredEntries, activeFilters };
}

/**
 * Start the watch dashboard
 */
export async function watch(options: WatchOptions = {}): Promise<void> {
  // Set defaults
  const watchOptions: Required<WatchOptions> = {
    filter: options.filter || '',
    typeFilter: options.typeFilter || '',
    statusFilter: options.statusFilter || '',
    limit: options.limit || 10,
    spec: options.spec || '',
    untilPass: options.untilPass || false
  };

  // Start telemetry session
  telemetry.startSession('watch');

  // Check if watching a specific spec until it passes
  const watchUntilPass = watchOptions.spec && watchOptions.untilPass;

  // Ensure the log file exists
  if (!fs.existsSync(RUN_LOG_FILE)) {
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    // Create an empty log file
    fs.writeFileSync(RUN_LOG_FILE, '', 'utf8');
  }
  
  // Read the existing log file
  const fileContent = fs.readFileSync(RUN_LOG_FILE, 'utf8');
  
  // Parse the log entries
  const entries: LogEntry[] = fileContent
    .split(os.EOL)
    .filter(Boolean)
    .map(parseLogLine)
    .filter((entry): entry is LogEntry => entry !== null);

  // Apply filters
  const { filteredEntries, activeFilters } = applyFilters(entries, watchOptions);

  // Function to check if a spec has passed
  function hasSpecPassed(specName: string, entries: LogEntry[]): boolean {
    // Get the most recent entry for this spec
    const specEntries = entries
      .filter(entry => entry.spec.toLowerCase() === specName.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return specEntries.length > 0 && specEntries[0].success;
  }

  // Check if watching until pass and the spec has already passed
  if (watchUntilPass) {
    const specName = watchOptions.spec.toLowerCase();
    if (hasSpecPassed(specName, entries)) {
      console.log(chalk.green(`\n✓ Spec "${watchOptions.spec}" has already passed!`));
      process.exit(0);
    }
  }

  /**
   * Clear the console and render the dashboard
   */
  function renderDashboard(entries: LogEntry[], filterOptions: WatchOptions): void {
    // Apply filters
    const { filteredEntries, activeFilters } = applyFilters(entries, filterOptions);

    // Sort entries with most recent on top
    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Take only the specified number of entries
    const recentEntries = sortedEntries.slice(0, filterOptions.limit);

    // Check if watching until pass and the spec has passed
    if (watchUntilPass) {
      const specName = watchOptions.spec.toLowerCase();
      if (hasSpecPassed(specName, entries)) {
        console.clear();
        console.log(chalk.green(`\n✓ Spec "${watchOptions.spec}" has passed!\n`));
        process.exit(0);
      }
    }
    
    // Clear the console
    console.clear();
    
    // Print a header
    console.log(chalk.cyan('\n  CheckMate Live Dashboard\n'));
    
    // Show active filters if any
    if (activeFilters.length > 0) {
      console.log(chalk.yellow(`  Filters active: ${activeFilters.join(', ')}`));
      console.log('');
    }

    // Show watching until pass message if applicable
    if (watchUntilPass) {
      console.log(chalk.cyan(`  Watching spec "${watchOptions.spec}" until it passes...\n`));
    }
    
    // Print the header
    console.log(renderHeader());
    console.log(renderSeparator());
    
    if (recentEntries.length === 0) {
      console.log('\n  ' + chalk.yellow('No check results found matching the current filters.'));
      console.log('  ' + chalk.yellow('Run specs with "checkmate run" or modify your filters to see results here.'));
      console.log('');
    } else {
      recentEntries.forEach(entry => {
        console.log(renderRow(entry));
      });
    }
    
    // Print a footer
    console.log(renderSeparator());
    
    // Get telemetry summary for this session
    try {
      const t = telemetry.summary();
      if (t.tokens > 0) {
        console.log(chalk.blue(`\n  Tokens: ${t.tokens.toLocaleString()} / Est. Cost: $${t.cost.toFixed(4)} this session`));
      }
    } catch (e) {
      // Silently continue if telemetry fails
    }
    
    console.log(chalk.cyan(`\n  Watching for changes to ${RUN_LOG_FILE}`));
    console.log(chalk.cyan('  Press Ctrl+C to exit\n'));
  }
  
  // Render the initial dashboard
  renderDashboard(entries, watchOptions);
  
  // Watch for changes to the log file
  const watcher = chokidar.watch(RUN_LOG_FILE, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    },
  });
  
  // Handle file changes
  watcher.on('change', (filePath) => {
    try {
      // Read the file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Parse the log entries
      const entries: LogEntry[] = fileContent
        .split(os.EOL)
        .filter(Boolean)
        .map(parseLogLine)
        .filter((entry): entry is LogEntry => entry !== null);
      
      // Render the updated dashboard
      renderDashboard(entries, watchOptions);
    } catch (error) {
      console.error('Error handling file change:', error);
    }
  });
  
  // Print a message
  console.log(chalk.cyan('Watching for changes to run.log...'));
  
  // Handle exit
  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.yellow('\nClosing watch dashboard.'));
    process.exit(0);
  });
} 