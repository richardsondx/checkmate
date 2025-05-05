#!/usr/bin/env node

/**
 * Cursor task wrapper for Checkmate
 * 
 * This script wraps Checkmate commands with visual indicators for Cursor tasks
 * Usage: node scripts/cursor-task-wrapper.js <task_type> "<command>"
 * Example: node scripts/cursor-task-wrapper.js pre_task "checkmate affected"
 */

import { exec } from 'child_process';
import path from 'path';

// ANSI color codes for direct console output
const COLORS = {
  BLUE: '\x1b[38;2;75;156;211m',
  GREEN: '\x1b[38;2;80;200;120m',
  RED: '\x1b[38;2;255;107;107m',
  ORANGE: '\x1b[38;2;255;165;0m',
  BOLD: '\x1b[1m',
  RESET: '\x1b[0m'
};

// Task type symbols and names
const TASK_INFO = {
  pre_task: {
    symbol: '🔍',
    name: 'SCOPE ANALYSIS',
    color: COLORS.BLUE
  },
  post_task: {
    symbol: '✓',
    name: 'VERIFICATION',
    color: COLORS.GREEN
  },
  post_push: {
    symbol: '🚀',
    name: 'REGRESSION TEST',
    color: COLORS.RED
  },
  default: {
    symbol: '⚙️',
    name: 'TASK',
    color: COLORS.ORANGE
  }
};

// Get arguments
const taskType = process.argv[2] || 'default';
const command = process.argv[3] || '';

if (!command) {
  console.error('Error: No command specified');
  process.exit(1);
}

// Get task info
const taskInfo = TASK_INFO[taskType] || TASK_INFO.default;

// Print banner
function printBanner(message) {
  const logo = ' ♟️ CHECKMATE ';
  const separator = '━'.repeat(message.length > 40 ? 60 : message.length + 20);
  
  console.log();
  console.log(`${taskInfo.color}╭${separator}╮${COLORS.RESET}`);
  console.log(`${taskInfo.color}│ ${COLORS.BOLD}${logo}${COLORS.RESET}${taskInfo.color} ${taskInfo.symbol} ${COLORS.BOLD}${taskInfo.name.padEnd(separator.length - logo.length - taskInfo.symbol.length - 4)}${COLORS.RESET}${taskInfo.color} │${COLORS.RESET}`);
  console.log(`${taskInfo.color}│ ${message.padEnd(separator.length - 2)} │${COLORS.RESET}`);
  console.log(`${taskInfo.color}╰${separator}╯${COLORS.RESET}`);
  console.log();
}

// Print start banner
printBanner(`Running: ${command}`);

// Execute the command with the task type as an environment variable
const child = exec(command, {
  env: {
    ...process.env,
    CM_TASK_TYPE: taskType // Set the task type as an environment variable
  }
});

// Pipe stdout and stderr
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// Handle process exit
child.on('exit', (code) => {
  const exitMessage = code === 0 
    ? `Command completed successfully` 
    : `Command failed with exit code ${code}`;
    
  // Print end banner
  printBanner(exitMessage);
  
  // Exit with the same code
  process.exit(code);
}); 