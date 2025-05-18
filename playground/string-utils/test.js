const stringUtils = require('./string-utils');

// Test reverse string
const reversedHello = stringUtils.reverseString('hello');
console.log('Reversed "hello":', reversedHello);
// Expected: "olleh"

// Test capitalize string
const capitalizedHello = stringUtils.capitalizeString('hello');
console.log('Capitalized "hello":', capitalizedHello);
// Expected: "HELLO"

// Test count characters
const charCount = stringUtils.countCharacters('hello');
console.log('Character count in "hello":', charCount);
// Expected: 5 