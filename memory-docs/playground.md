# CheckMate Playground Guide

This guide walks through setting up a simple playground to demonstrate CheckMate in action. This example is designed to be simple enough for anyone to understand, even without coding experience.

## What We're Building

A simple string utility with two functions:
1. **Reverse a string**: Convert "hello" to "olleh"
2. **Capitalize a string**: Convert "hello" to "HELLO"

## Setup Instructions

### 1. Create a New Project

```bash
# Create a project directory
mkdir checkmate-playground
cd checkmate-playground

# Initialize a new Node.js project
npm init -y

# Install CheckMate
npm install checkmateai
```

### 2. Initialize CheckMate

```bash
# Initialize CheckMate in your project
npx checkmateai init
```

When prompted, add your OpenAI and Anthropic API keys to the `.checkmate` file.

### 3. Create a Simple String Utility

Create a file named `string-utils.js` with the following content:

```javascript
// string-utils.js
function reverseString(str) {
  return str.split('').reverse().join('');
}

function capitalizeString(str) {
  return str.toUpperCase();
}

module.exports = {
  reverseString,
  capitalizeString
};
```

### 4. Generate a CheckMate Spec

Use CheckMate to generate a specification for our string utility:

```bash
npx checkmate gen "String utility with functions to reverse and capitalize strings"
```

This will create a specification file in the `checkmate/specs/` directory.

### 5. Test the Implementation

Now let's verify that our implementation meets the specification:

```bash
npx checkmate status
```

You should see that some checks are passing and some might be failing.

### 6. Fix any Issues

If any checks are failing, you can use the `clarify` command to get suggestions on how to fix them:

```bash
npx checkmate clarify string-utility
```

Make the necessary changes to your implementation until all checks pass.

### 7. Cursor Integration Demo

To demonstrate CheckMate with Cursor:

1. Open your project in Cursor
2. Set up MCP integration:
   ```bash
   npx checkmate setup-mcp
   ```
3. In Cursor, try making a change that breaks the specification (for example, change `capitalizeString` to return lowercase instead)
4. Ask Cursor to verify the implementation: "Verify the string utility implementation with CheckMate"
5. Watch as Cursor identifies the issue and suggests a fix

## Video Recording Suggestions

When recording your demonstration video:

1. Start with explaining what CheckMate is (AI-powered specification verification)
2. Show the simple string utility implementation
3. Demonstrate generating a specification with `checkmate gen`
4. Run `checkmate status` to check implementation status
5. Intentionally break one function and show how CheckMate catches the issue
6. Fix the issue and show CheckMate verifying the fix
7. Show Cursor integration if applicable

## Example Prompts for Cursor

Here are some prompts you can use with Cursor during your demonstration:

- "Generate a CheckMate spec for a string utility that can reverse and capitalize strings"
- "Check if my string utility implementation passes all CheckMate specs"
- "I changed the capitalizeString function, verify if it still meets the specification"
- "Fix my string utility implementation to pass all CheckMate specifications"

This simple example clearly demonstrates how CheckMate works to verify code against specifications, making it perfect for an introductory video. 