# CheckMate Playground

This playground contains three simple utility modules to test CheckMate's verification workflow. Each example is designed to be simple and easy to understand, even for those with minimal coding experience.

## Examples Included

1. **String Utilities** - Basic string manipulation functions
   - `reverseString`: Reverses a string (e.g., "hello" → "olleh")
   - `capitalizeString`: Converts a string to uppercase (e.g., "hello" → "HELLO")
   - `countCharacters`: Counts the number of characters in a string

2. **Number Utilities** - Basic mathematical operations
   - `add`: Adds two numbers
   - `multiply`: Multiplies two numbers
   - `isEven`: Checks if a number is even

3. **Array Utilities** - Basic array operations
   - `findMax`: Finds the maximum value in an array
   - `filterEven`: Returns only even numbers from an array
   - `sumArray`: Calculates the sum of all elements in an array

## Getting Started

### Setup

1. Clone this playground folder to your local machine
2. Install CheckMate:
   ```bash
   npm install checkmateai
   ```
3. Initialize CheckMate in the playground directory:
   ```bash
   npx checkmateai init
   ```
4. Add your API keys to the `.checkmate` file

### Testing the Examples

Run the example tests to make sure everything works:
```bash
npm run test-all  # Run all tests
npm run test-string  # Run only string utility tests
npm run test-number  # Run only number utility tests
npm run test-array  # Run only array utility tests
```

## Using CheckMate for Verification

### 1. Generate Specifications

Generate CheckMate specs for each utility:

```bash
# Generate spec for string utilities
npx checkmate gen "String utility with functions to reverse strings, capitalize strings, and count characters"

# Generate spec for number utilities
npx checkmate gen "Number utility with functions to add two numbers, multiply two numbers, and check if a number is even"

# Generate spec for array utilities
npx checkmate gen "Array utility with functions to find the maximum value, filter even numbers, and calculate the sum of an array"
```

### 2. Check Specification Status

Verify that implementations meet the generated specifications:

```bash
npx checkmate status
```

### 3. Intentionally Break an Implementation

To test CheckMate's verification abilities, you can intentionally break one of the functions:

1. Open `string-utils/string-utils.js`
2. Change the `capitalizeString` function to return lowercase instead:
   ```js
   function capitalizeString(str) {
     return str.toLowerCase(); // This breaks the function
   }
   ```

### 4. Verify with CheckMate

Check if CheckMate catches the issue:

```bash
npx checkmate status
```

### 5. Cursor Integration

To test with Cursor:

1. Set up MCP integration:
   ```bash
   npx checkmate setup-mcp
   ```

2. Open the project in Cursor

3. Ask Cursor to verify the implementation:
   ```
   Verify the string utility implementation with CheckMate
   ```

4. Ask Cursor to fix the issue:
   ```
   Fix the capitalizeString function to meet the CheckMate specification
   ```

## Example Workflow for Verifying the String Utility

Here's a detailed workflow using the verify-llm-reasoning command to demonstrate the CheckMate verification process on the string utility:

```bash
# Reset any previous verification state
checkmate reset "string-utility"

# Verify the first check (reverse string functionality)
checkmate verify-llm-reasoning --spec "string-utility" --check-id "1" \
  --success-condition "Function correctly reverses input strings" \
  --failure-condition "Function fails to reverse input strings correctly" \
  --outcome-report "Testing reverseString('hello') returns 'olleh'"

# Verify the second check (capitalize string functionality)
checkmate verify-llm-reasoning --spec "string-utility" --check-id "2" \
  --success-condition "Function correctly converts strings to uppercase" \
  --failure-condition "Function fails to convert strings to uppercase" \
  --outcome-report "Testing capitalizeString('hello') returns 'HELLO'"

# Verify the third check (count characters functionality)
checkmate verify-llm-reasoning --spec "string-utility" --check-id "3" \
  --success-condition "Function correctly counts characters in a string" \
  --failure-condition "Function fails to count characters correctly" \
  --outcome-report "Testing countCharacters('hello') returns 5"
```

This sequential verification of individual checks demonstrates the correct approach to using CheckMate's verification workflow.

## Demonstrations

These examples are ideal for demonstrating CheckMate in video tutorials:

1. Start by explaining the simple utilities
2. Generate specs with `checkmate gen`
3. Verify that implementations meet specs with `checkmate status`
4. Break a function and show CheckMate catching the issue
5. Demonstrate how Cursor can both detect and fix the issue using CheckMate

These examples clearly show how CheckMate verifies code against specifications, making them perfect for demonstrations or testing the CheckMate package. 