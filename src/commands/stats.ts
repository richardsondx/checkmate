#!/usr/bin/env node
/**
 * stats.ts - CheckMate token usage statistics
 * Display token usage and cost information
 */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as telemetry from '../lib/telemetry.js';
import path from 'path';
import fs from 'fs';

// Ensure telemetry is initialized 
telemetry.startSession('stats');

// Command line arguments
const argv = yargs(hideBin(process.argv))
  .option('since', {
    alias: 's',
    type: 'string',
    description: 'Show stats since timeframe (e.g., 24h, 7d)',
  })
  .option('session', {
    alias: 'id',
    type: 'string',
    description: 'Show stats for specific session ID',
  })
  .option('all', {
    alias: 'a',
    type: 'boolean',
    description: 'Show stats for all sessions',
  })
  .option('json', {
    type: 'boolean',
    description: 'Output in JSON format',
  })
  .option('detailed', {
    alias: 'd',
    type: 'boolean',
    description: 'Show detailed breakdown of each API request',
  })
  .help()
  .parseSync();

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format cost as dollars
 */
function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format datetime
 */
function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Display stats in CLI table format
 */
function displayStatsTable(summary: ReturnType<typeof telemetry.summary>): void {
  // Create model breakdown table
  const modelTable = new Table({
    head: [
      chalk.cyan('Model'),
      chalk.cyan('Input Tokens'),
      chalk.cyan('Output Tokens'),
      chalk.cyan('Total Tokens'),
      chalk.cyan('Est. Cost'),
    ],
    style: {
      head: [], // Disable colors in header
    },
  });

  // Add rows for each model
  for (const [modelKey, data] of Object.entries(summary.byModel)) {
    modelTable.push([
      modelKey + (data.isEstimated ? chalk.yellow(' ⚠️') : ''),
      formatNumber(data.tokens.input),
      formatNumber(data.tokens.output),
      formatNumber(data.tokens.total),
      formatCost(data.cost),
    ]);
  }

  // Add total row
  modelTable.push([
    chalk.bold('TOTAL'),
    chalk.bold(formatNumber(Object.values(summary.byModel).reduce((sum, data) => sum + data.tokens.input, 0))),
    chalk.bold(formatNumber(Object.values(summary.byModel).reduce((sum, data) => sum + data.tokens.output, 0))),
    chalk.bold(formatNumber(summary.tokens)),
    chalk.bold(formatCost(summary.cost)),
  ]);

  // Display the table
  console.log(modelTable.toString());

  // Show warning if estimates were used
  if (summary.estimatedTokens > 0) {
    console.log(chalk.yellow('\n⚠️  Some token counts are estimates based on text length (when provider does not return usage)'));
  }
}

/**
 * Display detailed breakdown of individual API requests
 */
function displayDetailedBreakdown(): void {
  const folderPath = path.join(process.cwd(), '.checkmate-telemetry');
  if (!fs.existsSync(folderPath)) {
    console.log(chalk.yellow('\nNo telemetry data found.'));
    return;
  }

  // Get list of files based on filters
  let files: string[] = [];
  
  if (argv.session) {
    // Filter by session ID
    const sessionId = String(argv.session);
    files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.jsonl') && file.startsWith(sessionId))
      .map(file => path.join(folderPath, file));
  } else if (argv.since) {
    // Filter by time
    const sinceTime = new Date().getTime() - telemetry.parseTimeFilter(String(argv.since));
    
    files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.jsonl'))
      .filter(file => {
        const stats = fs.statSync(path.join(folderPath, file));
        const fileTime = new Date(stats.mtime).getTime();
        return fileTime >= sinceTime;
      })
      .map(file => path.join(folderPath, file));
  } else if (argv.all) {
    // All files
    files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => path.join(folderPath, file));
  } else {
    // Current session or most recent
    const currentSession = telemetry.getCurrentSession();
    if (currentSession && currentSession.id) {
      files = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.jsonl') && file.startsWith(currentSession.id))
        .map(file => path.join(folderPath, file));
    } else {
      // Get most recent file
      const recentFiles = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(folderPath, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (recentFiles.length > 0) {
        files = [path.join(folderPath, recentFiles[0].name)];
      }
    }
  }

  if (files.length === 0) {
    console.log(chalk.yellow('\nNo matching telemetry data found.'));
    return;
  }

  // Create detailed table
  const detailedTable = new Table({
    head: [
      chalk.cyan('Timestamp'),
      chalk.cyan('Command'),
      chalk.cyan('Provider/Model'),
      chalk.cyan('Input'),
      chalk.cyan('Output'),
      chalk.cyan('Total'),
      chalk.cyan('Est. Cost'),
      chalk.cyan('Duration (ms)'),
    ],
    style: {
      head: [], // Disable colors in header
    },
    colWidths: [24, 12, 30, 10, 10, 10, 10, 12],
  });

  let totalRequests = 0;
  let skippedEntries = 0;

  // Process each file
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          // Skip session start entries
          if (entry.provider === 'system') continue;
          
          totalRequests++;
          
          // Calculate cost
          const modelKey = `${entry.provider}/${entry.model}`;
          const price = telemetry.getPricing(entry.provider, entry.model);
          const totalTokens = entry.in + entry.out;
          const cost = (totalTokens / 1000) * price;
          
          detailedTable.push([
            formatDateTime(entry.ts),
            entry.cmd,
            `${entry.provider}/${entry.model}`,
            formatNumber(entry.in),
            formatNumber(entry.out),
            formatNumber(totalTokens),
            formatCost(cost),
            entry.ms ? formatNumber(entry.ms) : 'N/A',
          ]);
          
        } catch (error) {
          skippedEntries++;
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  if (totalRequests === 0) {
    console.log(chalk.yellow('\nNo API requests found in the selected period.'));
    return;
  }

  console.log(chalk.bold(`\n📊 Detailed API Request Breakdown (${totalRequests} requests)\n`));
  console.log(detailedTable.toString());
  
  if (skippedEntries > 0) {
    console.log(chalk.yellow(`\nNote: Skipped ${skippedEntries} invalid entries.`));
  }
}

// Main execution
(async () => {
  let usageSummary;

  // Get stats based on options
  if (argv.session) {
    usageSummary = telemetry.getAllSessionsSummary({ sessionId: argv.session });
  } else if (argv.since) {
    usageSummary = telemetry.getAllSessionsSummary({ since: argv.since });
  } else if (argv.all) {
    usageSummary = telemetry.getAllSessionsSummary({});
  } else {
    // Default to current session
    usageSummary = telemetry.summary();
  }

  // Display as JSON if requested
  if (argv.json) {
    console.log(JSON.stringify(usageSummary, null, 2));
    return;
  }

  // Header
  console.log(chalk.bold('\n📊 CheckMate Token Usage Statistics\n'));

  // Period description
  if (argv.session) {
    console.log(chalk.blue(`Session: ${argv.session}`));
  } else if (argv.since) {
    console.log(chalk.blue(`Period: Last ${argv.since}`));
  } else if (argv.all) {
    console.log(chalk.blue('Period: All time'));
  } else {
    console.log(chalk.blue('Period: Current session'));
  }

  // No usage
  if (usageSummary.tokens === 0) {
    console.log(chalk.yellow('\nNo usage data found for the selected period.\n'));
    return;
  }

  // Display table
  displayStatsTable(usageSummary);
  
  // Show detailed breakdown if requested
  if (argv.detailed) {
    displayDetailedBreakdown();
  }
  
  // Footer
  console.log(`\nTotal tokens: ${formatNumber(usageSummary.tokens)}`);
  console.log(`Estimated cost: ${formatCost(usageSummary.cost)}\n`);
})(); 