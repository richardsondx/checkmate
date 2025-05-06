/**
 * Banner and welcome box for CheckMate CLI
 */
import chalk from 'chalk';
import boxen from 'boxen';

// ASCII Art for CHECKMATE
const asciiArt = `
 ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗███╗   ███╗ █████╗ ████████╗███████╗
██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
██║     ███████║█████╗  ██║     █████╔╝ ██╔████╔██║███████║   ██║   █████╗
██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝
╚██████╗██║  ██║███████╗╚██████╗██║  ██╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
 ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
`;

// Helper messages
const helpText = `
🎯 Your specs live in \`/checkmate/specs\`
🧠 Persistent memory for every feature
🧪 Reset after every pass, so nothing gets stale

✨ Type \`checkmate gen "your feature"\` to get started.
`;

/**
 * Prints the welcome box and ASCII banner
 */
export function printBanner(): void {
  // Print welcome box
  const boxTop = chalk.hex('#FFA500')(`╭──────────────────────────────────────────────────────────╮`);
  const welcome = chalk.hex('#FFA500')(`│    ✦ Welcome to the CheckMate CLI — AI‑Driven TDD ✦     │`);
  const subtext = chalk.hex('#FFA500')(`│     Keeping your features honest, one ✅ at a time.      │`);
  const boxBottom = chalk.hex('#FFA500')(`╰──────────────────────────────────────────────────────────╯`);

  console.log([boxTop, welcome, subtext, boxBottom].join('\n'));
  
  // Print ASCII art logo
  console.log(chalk.green(asciiArt));
  
  // Print help text
  console.log(chalk.white(helpText));
}

/**
 * Prints a simple box with a message
 * @param message The message to display in the box
 * @param options Optional settings for the box
 */
export function printBox(message: string, options?: { isPostTask?: boolean }): void {
  // If this is a post-task verification, add CheckMate mention in a bar at the top
  let finalMessage = message;
  if (options?.isPostTask) {
    const checkmateMention = chalk.hex('#50C878')(' ♟️ CHECKMATE VERIFICATION ');
    finalMessage = `${checkmateMention}\n${message}`;
  }
  
  console.log(
    boxen(chalk.white(finalMessage), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: options?.isPostTask ? '#50C878' : 'cyan',
    })
  );
}

/**
 * Prints a visually distinct Cursor task banner for CheckMate
 * @param taskType The type of task being run (pre_task, post_task, post_push)
 * @param message Additional details about the task
 */
export function printCursorTaskBanner(taskType: string, message: string): void {
  const taskSymbol = taskType === 'pre_task' ? '🔍' : 
                     taskType === 'post_task' ? '✓' : 
                     taskType === 'post_push' ? '🚀' : '⚙️';
  
  const taskName = taskType === 'pre_task' ? 'SCOPE ANALYSIS' : 
                   taskType === 'post_task' ? 'VERIFICATION' : 
                   taskType === 'post_push' ? 'REGRESSION TEST' : 'TASK';
  
  const borderColor = taskType === 'pre_task' ? '#4B9CD3' :  // Blue
                      taskType === 'post_task' ? '#50C878' : // Green
                      taskType === 'post_push' ? '#FF6B6B' : // Red
                      '#FFA500';                             // Orange (default)
  
  const logo = ' ♟️ CHECKMATE ';
  const separator = '━'.repeat(message.length > 40 ? 60 : message.length + 20);
  
  console.log();
  console.log(chalk.hex(borderColor)(`╭${separator}╮`));
  console.log(chalk.hex(borderColor)(`│ ${chalk.bold(logo)} ${taskSymbol} ${chalk.bold(taskName.padEnd(separator.length - logo.length - taskSymbol.length - 4))} │`));
  console.log(chalk.hex(borderColor)(`│ ${message.padEnd(separator.length - 2)} │`));
  console.log(chalk.hex(borderColor)(`╰${separator}╯`));
  console.log();
} 

/**
 * Prints a compact banner for use in commands like status
 * @param subtitle Optional subtitle to show after the main title
 */
export function printCompactBanner(subtitle?: string): void {
  const text = `✦ CheckMate CLI — AI‑Driven TDD${subtitle ? `: ${subtitle}` : ''} ✦`;
  const boxLength = text.length + 4; // Add padding
  const horizontalBorder = chalk.hex('#FFA500')('─'.repeat(boxLength));
  
  console.log('');
  console.log(chalk.hex('#FFA500')(`┌${horizontalBorder}┐`));
  console.log(chalk.hex('#FFA500')(`│  ${text}  │`));
  console.log(chalk.hex('#FFA500')(`└${horizontalBorder}┘`));
  console.log('');
} 