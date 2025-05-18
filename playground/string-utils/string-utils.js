/**
 * String Utilities
 * A collection of simple string manipulation functions
 */

/**
 * Reverses a string
 * @param {string} str - The string to reverse
 * @returns {string} The reversed string
 */
function reverseString(str) {
  return str.split('').reverse().join('');
}

/**
 * Capitalizes a string
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeString(str) {
  return str.toUpperCase();
}

/**
 * Counts the number of characters in a string
 * @param {string} str - The string to count characters in
 * @returns {number} The number of characters
 */
function countCharacters(str) {
  return str.length;
}

module.exports = {
  reverseString,
  capitalizeString,
  countCharacters
}; 