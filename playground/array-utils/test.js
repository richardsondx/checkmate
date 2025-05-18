const arrayUtils = require('./array-utils');

// Test array for all functions
const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Test findMax function
const maxValue = arrayUtils.findMax(testArray);
console.log('Maximum value in', testArray, 'is:', maxValue);
// Expected: 10

// Test filterEven function
const evenNumbers = arrayUtils.filterEven(testArray);
console.log('Even numbers in', testArray, 'are:', evenNumbers);
// Expected: [2, 4, 6, 8, 10]

// Test sumArray function
const arraySum = arrayUtils.sumArray(testArray);
console.log('Sum of all elements in', testArray, 'is:', arraySum);
// Expected: 55 