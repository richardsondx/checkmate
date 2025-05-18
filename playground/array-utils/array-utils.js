/**
 * Array Utilities
 * A collection of simple array manipulation functions
 */

/**
 * Finds the maximum value in an array of numbers
 * @param {number[]} arr - Array of numbers
 * @returns {number} The maximum value in the array
 */
function findMax(arr) {
  return Math.max(...arr);
}

/**
 * Returns only the even numbers from an array
 * @param {number[]} arr - Array of numbers
 * @returns {number[]} Array containing only even numbers
 */
function filterEven(arr) {
  return arr.filter(num => num % 2 === 0);
}

/**
 * Calculates the sum of all elements in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} The sum of all elements
 */
function sumArray(arr) {
  return arr.reduce((sum, current) => sum + current, 0);
}

module.exports = {
  findMax,
  filterEven,
  sumArray
}; 