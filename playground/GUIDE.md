# CheckMate Playground Guide

This guide provides step-by-step instructions for using the CheckMate playground to test and demonstrate the CheckMate verification workflow. This playground is designed to be simple enough for anyone to understand, even with minimal coding experience.

## Prerequisites

- Node.js installed (version 14 or higher)
- Cursor AI editor (recommended for the best experience)
- OpenAI API key
- Anthropic API key (recommended but optional)

## Setup Instructions

1. **Clone the Playground Directory**
   ```bash
   # Copy the playground directory to your machine
   cp -r /path/to/checkmate/playground /your/workspace/
   cd /your/workspace/playground
   ```

2. **Install CheckMate**
   ```bash
   npm install checkmateai
   ```

3. **Initialize CheckMate**
   ```bash
   npx checkmateai init
   ```

4. **Configure API Keys**
   
   Edit the `.checkmate` file (created by the init command) and add your API keys:
   ```yaml
   openai_key: sk-****      # Your OpenAI API key 
   anthropic_key: sk-ant-**** # Your Anthropic API key (optional but recommended)
   ```

5. **Setup MCP Integration for Cursor**
   ```bash
   npx checkmate setup-mcp
   ```

## Quick Verification Test

Run this quick test to ensure everything is working:

```bash
# Run a basic test on the string utilities
npm run test-string

# Generate a spec for the string utilities
npx checkmate gen "String utility with functions to reverse strings, capitalize strings, and count characters"

# Check if the implementation meets the specification
npx checkmate status
```

## Detailed Verification Workflow

### 1. String Utility Verification

Follow these steps to verify the string utility implementation:

```bash
# Reset any previous verification state
npx checkmate reset "string-utility"

# Verify the reverse string functionality
npx checkmate verify-llm-reasoning --spec "string-utility" --check-id "1" \
  --success-condition "Function correctly reverses input strings" \
  --failure-condition "Function fails to reverse input strings correctly" \
  --outcome-report "Testing reverseString('hello') returns 'olleh'"

# Verify the capitalize string functionality
npx checkmate verify-llm-reasoning --spec "string-utility" --check-id "2" \
  --success-condition "Function correctly converts strings to uppercase" \
  --failure-condition "Function fails to convert strings to uppercase" \
  --outcome-report "Testing capitalizeString('hello') returns 'HELLO'"

# Verify the count characters functionality
npx checkmate verify-llm-reasoning --spec "string-utility" --check-id "3" \
  --success-condition "Function correctly counts characters in a string" \
  --failure-condition "Function fails to count characters correctly" \
  --outcome-report "Testing countCharacters('hello') returns 5"
```

### 2. Testing Failure Detection

Now, let's intentionally break the string utility to test CheckMate's ability to detect failures:

1. Edit `string-utils/string-utils.js`
2. Change the `capitalizeString` function to:
   ```js
   function capitalizeString(str) {
     return str.toLowerCase(); // This intentionally breaks the function
   }
   ```
3. Run the verification again:
   ```bash
   npx checkmate verify-llm-reasoning --spec "string-utility" --check-id "2" \
     --success-condition "Function correctly converts strings to uppercase" \
     --failure-condition "Function fails to convert strings to uppercase" \
     --outcome-report "Testing capitalizeString('hello') returns 'hello' instead of 'HELLO'"
   ```
4. Observe how CheckMate detects the failure

### 3. Using Cursor for Verification

Now let's demonstrate how Cursor can use CheckMate for verification:

1. Open your playground project in Cursor
2. Ask Cursor to verify the string utility:
   ```
   Verify the string utility implementation with CheckMate
   ```
3. Cursor should detect the issue with the `capitalizeString` function
4. Ask Cursor to fix the issue:
   ```
   Fix the capitalizeString function to meet the CheckMate specification
   ```
5. Cursor should modify the code to fix the issue
6. Ask Cursor to verify again to confirm the fix:
   ```
   Verify the string utility implementation with CheckMate
   ```

## Additional Testing Examples

### Number Utility Verification

```bash
# Generate a spec for the number utilities
npx checkmate gen "Number utility with functions to add two numbers, multiply two numbers, and check if a number is even"

# Verify each check individually
npx checkmate verify-llm-reasoning --spec "number-utility" --check-id "1" \
  --success-condition "Function correctly adds two numbers" \
  --failure-condition "Function fails to add two numbers correctly" \
  --outcome-report "Testing add(5, 3) returns 8"

npx checkmate verify-llm-reasoning --spec "number-utility" --check-id "2" \
  --success-condition "Function correctly multiplies two numbers" \
  --failure-condition "Function fails to multiply two numbers correctly" \
  --outcome-report "Testing multiply(5, 3) returns 15"

npx checkmate verify-llm-reasoning --spec "number-utility" --check-id "3" \
  --success-condition "Function correctly identifies even numbers" \
  --failure-condition "Function fails to identify even numbers correctly" \
  --outcome-report "Testing isEven(4) returns true and isEven(5) returns false"
```

### Array Utility Verification

```bash
# Generate a spec for the array utilities
npx checkmate gen "Array utility with functions to find the maximum value, filter even numbers, and calculate the sum of an array"

# Verify each check individually
npx checkmate verify-llm-reasoning --spec "array-utility" --check-id "1" \
  --success-condition "Function correctly finds the maximum value in an array" \
  --failure-condition "Function fails to find the maximum value in an array" \
  --outcome-report "Testing findMax([1,2,3,4,5,6,7,8,9,10]) returns 10"

npx checkmate verify-llm-reasoning --spec "array-utility" --check-id "2" \
  --success-condition "Function correctly filters even numbers from an array" \
  --failure-condition "Function fails to filter even numbers from an array" \
  --outcome-report "Testing filterEven([1,2,3,4,5,6,7,8,9,10]) returns [2,4,6,8,10]"

npx checkmate verify-llm-reasoning --spec "array-utility" --check-id "3" \
  --success-condition "Function correctly calculates the sum of an array" \
  --failure-condition "Function fails to calculate the sum of an array" \
  --outcome-report "Testing sumArray([1,2,3,4,5,6,7,8,9,10]) returns 55"
```

## Troubleshooting

If you encounter any issues:

1. **Verify API Keys**: Ensure your API keys are correctly set in the `.checkmate` file
2. **Check Node Version**: Ensure you're using Node.js version 14 or higher
3. **Reinstall CheckMate**: Try reinstalling CheckMate with `npm uninstall checkmateai && npm install checkmateai`
4. **MCP Integration**: If Cursor doesn't recognize CheckMate commands, try restarting Cursor after running `npx checkmate setup-mcp`

## Conclusion

This playground provides a simple way to test and demonstrate CheckMate's verification workflow. By following the steps in this guide, you can see how CheckMate works to verify that implementations meet their specifications.

For more detailed information about CheckMate, refer to the main documentation or README in the CheckMate repository. 