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
  
  // Footer
  console.log(`\nTotal tokens: ${formatNumber(usageSummary.tokens)}`);
  console.log(`Estimated cost: ${formatCost(usageSummary.cost)}\n`);
})(); 