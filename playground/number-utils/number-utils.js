/**
 * Number Utilities
 * A collection of simple mathematical operations
 */

/**
 * Adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum of a and b
 */
function add(a, b) {
  return a + b;
}

/**
 * Multiplies two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The product of a and b
 */
function multiply(a, b) {
  return a * b;
}

/**
 * Checks if a number is even
 * @param {number} num - The number to check
 * @returns {boolean} True if the number is even, false otherwise
 */
function isEven(num) {
  return num % 2 === 0;
}

module.exports = {
  add,
  multiply,
  isEven
}; 