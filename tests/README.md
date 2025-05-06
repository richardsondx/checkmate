# CheckMate Tests

This directory contains tests for the CheckMate project. The tests are organized into the following directories:

- `unit/`: Unit tests for individual components
  - `commands/`: Tests for commands in src/commands
  - `scripts/`: Tests for scripts in scripts/
- `integration/`: Integration tests that test multiple components together

## Running Tests

To run all tests, use:

```bash
npm test
```

To check test coverage:

```bash
npm run test:coverage
```

Or, to run the test runner directly:

```bash
node tests/run-tests.mjs
```

You can also run individual tests by executing them directly:

```bash
node tests/unit/test-splitter.mjs
```

## Test Files Overview

### Unit Tests

#### Core Unit Tests
- `test-splitter.mjs`: Tests the feature splitter functionality
- `test-cursor-rules.mjs`: Tests the Cursor rule files functionality

#### Command Unit Tests
- `commands/test-config.mjs`: Tests the config command functionality
- `commands/test-clean.mjs`: Tests the clean command functionality
- `commands/test-init.mjs`: Tests the init command functionality
- `commands/test-status.mjs`: Tests the status command functionality

#### Script Unit Tests
- `scripts/test-cm-enforce.mjs`: Tests the enforcement script functionality
- `scripts/test-spec-snapshot.mjs`: Tests the spec snapshot script functionality

### Integration Tests

- `test-ai.mjs`: Tests the AI model integration
- `test-config.mjs`: Tests configuration loading and parsing
- `test-mcp.mjs`: Tests the MCP router functionality
- `test-models.mjs`: Tests the model integration
- `test-spec-types.mjs`: Tests the spec type functionality
- `test.mjs`: Basic OpenAI API test

## Adding New Tests

When adding new tests:

1. Place unit tests in the `unit/` directory
   - For command tests, use `unit/commands/`
   - For script tests, use `unit/scripts/`
2. Place integration tests in the `integration/` directory
3. Follow the naming convention of `test-*.mjs`
4. Make sure your test exits with code 0 on success and non-zero on failure

## Test Coverage

The `run-coverage.mjs` script analyzes the codebase and reports on test coverage. It identifies which commands and scripts have tests and which ones are missing tests.

To improve test coverage:

1. Identify components without tests using `npm run test:coverage`
2. Create new tests for those components
3. Follow the existing test patterns

## Future Improvements

In the future, we might want to:

1. Migrate to a proper testing framework like Jest
2. Add automated test coverage reporting
3. Integrate tests with CI/CD pipelines 
4. Add more comprehensive integration tests
5. Add component tests for UI elements 