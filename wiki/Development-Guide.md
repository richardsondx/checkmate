# CheckMate Development Guide

This guide covers the development workflow and testing procedures for CheckMate.

## Running Tests

```bash
# Run all tests
npm test

# Run a specific test
node tests/unit/test-splitter.mjs

# Check test coverage
npm run test:coverage

# Run tests and check coverage with interactive mode
npm run test:all
```

The test coverage script provides an overview of which commands and scripts have tests and identifies areas for improvement.

See `tests/README.md` for more details on the testing architecture.

## Adding New Tests

To add a new test for a command or script:

1. Run the interactive test coverage tool:
   ```bash
   npm run test:all
   ```

2. When prompted, choose to create tests for uncovered commands
3. Enter the name of the command or script you want to test
4. The tool will create a template test file that you can customize

Alternatively, manually create a test file in the appropriate directory:
- Command tests go in `tests/unit/commands/test-{command-name}.mjs`
- Script tests go in `tests/unit/scripts/test-{script-name}.mjs`

## Project Structure

The CheckMate project follows this structure:

```
project-root
├── .checkmate        # YAML config (never committed)
├── .cursor/
│   └── rules/        # Cursor rule files for automation
├── checkmate/
│   ├── specs/        # one .md file per feature
│   │   └── agents/   # YAML spec files with runnable tests
│   ├── logs/         # JSONL history (optional)
│   └── cache/        # raw model chatter
├── src/              # source code
│   ├── commands/     # CLI command implementations
│   ├── lib/          # shared utilities
│   ├── mcp/          # MCP server implementation
│   └── ui/           # user interface components
└── tests/            # test files
    ├── unit/         # unit tests
    ├── integration/  # integration tests
    └── utils/        # test utilities
```

## Contributing

When contributing to CheckMate, please:

1. Create a feature branch from `main`
2. Follow the project's coding conventions
3. Add tests for any new functionality
4. Update documentation as needed
5. Submit a pull request

For more information, see [CONTRIBUTING.md](../CONTRIBUTING.md). 