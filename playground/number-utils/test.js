const numberUtils = require('./number-utils');

// Test add function
const sum = numberUtils.add(5, 3);
console.log('5 + 3 =', sum);
// Expected: 8

// Test multiply function
const product = numberUtils.multiply(5, 3);
console.log('5 * 3 =', product);
// Expected: 15

// Test isEven function
const evenCheck1 = numberUtils.isEven(4);
const evenCheck2 = numberUtils.isEven(5);
console.log('Is 4 even?', evenCheck1);
console.log('Is 5 even?', evenCheck2);
// Expected: true, false 