/**
 * Watch command for CheckMate CLI
 * Creates a live dashboard that tails the run.log file
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import chalk from 'chalk';
import chokidar from 'chokidar';

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
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
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
    chalk.bold('Status'.padEnd(10)),
    chalk.bold('Pass'.padEnd(10)),
    chalk.bold('Fail'.padEnd(10)),
  ].join('  ');
}

/**
 * Render a separator line
 */
function renderSeparator(): string {
  return chalk.gray('─'.repeat(90));
}

/**
 * Render a log entry as a row
 */
function renderRow(entry: LogEntry): string {
  const time = formatTimestamp(entry.timestamp).padEnd(10);
  const spec = entry.spec.padEnd(40);
  const status = entry.success 
    ? chalk.green('PASS'.padEnd(10)) 
    : chalk.red('FAIL'.padEnd(10));
  const passed = chalk.green(entry.passed.toString().padEnd(10));
  const failed = chalk.red((entry.total - entry.passed).toString().padEnd(10));

  return [time, spec, status, passed, failed].join('  ');
}

/**
 * Clear the console and render the dashboard
 */
function renderDashboard(entries: LogEntry[]): void {
  // Clear the console
  console.clear();
  
  // Print a header
  console.log(chalk.cyan('\n  CheckMate Live Dashboard\n'));
  
  // Print the header
  console.log(renderHeader());
  console.log(renderSeparator());
  
  // Print the entries (most recent first)
  const recentEntries = entries.slice(-10).reverse();
  recentEntries.forEach(entry => {
    console.log(renderRow(entry));
  });
  
  // Print a footer
  console.log(renderSeparator());
  console.log(chalk.cyan(`\n  Watching for changes to ${RUN_LOG_FILE}`));
  console.log(chalk.cyan('  Press Ctrl+C to exit\n'));
}

/**
 * Start the watch dashboard
 */
export async function watch(): Promise<void> {
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
  
  // Render the initial dashboard
  renderDashboard(entries);
  
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
      renderDashboard(entries);
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