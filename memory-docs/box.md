Implementation Tip (in Node with Chalk)
Use this to draw the box at runtime:

```
import chalk from 'chalk';

const boxTop = chalk.hex('#FFA500')(`╭──────────────────────────────────────────────────────────╮`);
const welcome = chalk.hex('#FFA500')(`│    ✦ Welcome to the CheckMate CLI — AI-Driven TDD ✦     │`);
const subtext = chalk.hex('#FFA500')(`│     Keeping your features honest, one ✅ at a time.      │`);
const boxBottom = chalk.hex('#FFA500')(`╰──────────────────────────────────────────────────────────╯`);

console.log([boxTop, welcome, subtext, boxBottom].join('\n'));

```