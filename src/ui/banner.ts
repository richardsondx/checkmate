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
  console.log(chalk.cyan(asciiArt));
  
  // Print help text
  console.log(chalk.white(helpText));
}

/**
 * Prints a simple box with a message
 */
export function printBox(message: string): void {
  console.log(
    boxen(chalk.white(message), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
} 