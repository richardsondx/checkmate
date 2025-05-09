"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBanner = printBanner;
exports.printBox = printBox;
exports.printCursorTaskBanner = printCursorTaskBanner;
exports.printCompactBanner = printCompactBanner;
/**
 * Banner and welcome box for CheckMate CLI
 */
var chalk_1 = require("chalk");
var boxen_1 = require("boxen");
// ASCII Art for CHECKMATE
var asciiArt = "\n \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\n\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\n\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2557\n\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2554\u2550\u2550\u255D\n\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\n \u255A\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D   \u255A\u2550\u255D   \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n";
// Helper messages
var helpText = "\n\uD83C\uDFAF Your specs live in `/checkmate/specs`\n\uD83E\uDDE0 Persistent memory for every feature\n\uD83E\uDDEA Reset after every pass, so nothing gets stale\n\n\u2728 Type `checkmate gen \"your feature\"` to get started.\n";
/**
 * Prints the welcome box and ASCII banner
 */
function printBanner() {
    // Welcome box with chess pattern
    // Use Unicode white and black square emojis for the chess pattern
    console.log(chalk_1.default.hex('#FFA500')("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E"));
    console.log(chalk_1.default.hex('#FFA500')("\u2502    \u2726 Welcome to the CheckMate CLI \u2014 AI\u2011Driven TDD \u2726      \u2502") + "  ⬜⬛");
    console.log(chalk_1.default.hex('#FFA500')("\u2502     Keeping your features honest, one \u2705 at a time.      \u2502") + "  ⬛⬜");
    console.log(chalk_1.default.hex('#FFA500')("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F"));
    // Print ASCII art logo
    console.log(chalk_1.default.green(asciiArt));
    // Print help text
    console.log(chalk_1.default.white(helpText));
}
/**
 * Prints a simple box with a message
 * @param message The message to display in the box
 * @param options Optional settings for the box
 */
function printBox(message, options) {
    // If this is a post-task verification, add CheckMate mention in a bar at the top
    var finalMessage = message;
    if (options === null || options === void 0 ? void 0 : options.isPostTask) {
        var checkmateMention = chalk_1.default.hex('#50C878')(' ♟️ CHECKMATE VERIFICATION ');
        finalMessage = "".concat(checkmateMention, "\n").concat(message);
    }
    console.log((0, boxen_1.default)(chalk_1.default.white(finalMessage), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: (options === null || options === void 0 ? void 0 : options.isPostTask) ? '#50C878' : 'cyan',
    }));
}
/**
 * Prints a visually distinct Cursor task banner for CheckMate
 * @param taskType The type of task being run (pre_task, post_task, post_push)
 * @param message Additional details about the task
 */
function printCursorTaskBanner(taskType, message) {
    var taskSymbol = taskType === 'pre_task' ? '🔍' :
        taskType === 'post_task' ? '✓' :
            taskType === 'post_push' ? '🚀' : '⚙️';
    var taskName = taskType === 'pre_task' ? 'SCOPE ANALYSIS' :
        taskType === 'post_task' ? 'VERIFICATION' :
            taskType === 'post_push' ? 'REGRESSION TEST' : 'TASK';
    var borderColor = taskType === 'pre_task' ? '#4B9CD3' : // Blue
        taskType === 'post_task' ? '#50C878' : // Green
            taskType === 'post_push' ? '#FF6B6B' : // Red
                '#FFA500'; // Orange (default)
    var logo = ' ♟️ CHECKMATE ';
    var separator = '━'.repeat(message.length > 40 ? 60 : message.length + 20);
    console.log();
    console.log(chalk_1.default.hex(borderColor)("\u256D".concat(separator, "\u256E")));
    console.log(chalk_1.default.hex(borderColor)("\u2502 ".concat(chalk_1.default.bold(logo), " ").concat(taskSymbol, " ").concat(chalk_1.default.bold(taskName.padEnd(separator.length - logo.length - taskSymbol.length - 4)), " \u2502")));
    console.log(chalk_1.default.hex(borderColor)("\u2502 ".concat(message.padEnd(separator.length - 2), " \u2502")));
    console.log(chalk_1.default.hex(borderColor)("\u2570".concat(separator, "\u256F")));
    console.log();
}
/**
 * Prints a compact banner for use in commands like status
 * @param subtitle Optional subtitle to show after the main title
 */
function printCompactBanner(subtitle) {
    var text = "\u2726 CheckMate CLI \u2014 AI\u2011Driven TDD".concat(subtitle ? ": ".concat(subtitle) : '', " \u2726");
    var boxLength = text.length + 4; // Add padding
    var horizontalBorder = chalk_1.default.hex('#FFA500')('─'.repeat(boxLength));
    console.log('');
    console.log(chalk_1.default.hex('#FFA500')("\u250C".concat(horizontalBorder, "\u2510")));
    console.log(chalk_1.default.hex('#FFA500')("\u2502  ".concat(text, "  \u2502")));
    console.log(chalk_1.default.hex('#FFA500')("\u2514".concat(horizontalBorder, "\u2518")));
    console.log('');
}
