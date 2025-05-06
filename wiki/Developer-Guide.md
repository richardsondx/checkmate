# Developer Guide

This guide is for developers who want to contribute to CheckMate or debug issues.

## Setting Up Local Development Environment

1. Clone the repository
   ```bash
   git clone https://github.com/checkmateai/checkmateai.git
   cd checkmateai
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the TypeScript files
   ```bash
   npm run build
   ```

4. Link the package locally
   ```bash
   npm link
   ```

This will make the `checkmate` command available globally, pointing to your local development version.

## Development Commands

- `npm run dev` - Run the CLI in development mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run checkmate -- <command>` - Run any checkmate command during development

## Debugging

If you encounter any issues with the display of terminal output:

1. Check the console debug logs which should show configurations and other diagnostic information
2. Try running with the raw TypeScript source: `NODE_OPTIONS="--loader ts-node/esm" ts-node src/index.ts <command>`
3. Review the logs in the `checkmate/logs` directory for execution details

## Testing AI Integration

Test the AI integration with our test scripts:

```bash
node test-ai.mjs  # Test direct OpenAI API calls
node test-config.mjs  # Test config file parsing
```

Make sure to set up your OpenAI API key in `.checkmate` file before testing.

## Project Structure

```
checkmateai/
├── src/               # Source code
│   ├── commands/      # CLI commands
│   ├── controllers/   # Business logic
│   ├── lib/           # Utilities and helpers
│   ├── mcp/           # Middleware Control Protocol server
│   ├── middlewares/   # Middleware functions
│   └── ui/            # Terminal UI components
├── dist/              # Compiled code
├── examples/          # Example usage
├── scripts/           # Helper scripts
└── test-*.mjs         # Test files
```

## Contributing Guidelines

1. **Create a feature branch**: Always work on a new branch for each change
2. **Write tests**: Include tests for your changes
3. **Follow code style**: Match the existing code style
4. **Write good commit messages**: Use clear and descriptive commit messages
5. **Update documentation**: Update relevant documentation
6. **Include a spec**: Create a CheckMate spec that proves your feature works

## Pull Request Process

1. Ensure your code passes all tests
2. Update the README.md and relevant documentation
3. Add a changelog entry if appropriate
4. Submit the PR with a clear description of the changes
5. Respond to any feedback from maintainers

## Creating a New Command

To add a new command to CheckMate:

1. Create a new file in `src/commands/` (use an existing command as a template)
2. Export the command structure with `name`, `description`, `action`, etc.
3. Register the command in `src/commands/index.ts`
4. Implement the business logic in `src/controllers/`
5. Add tests for your command
6. Update the documentation

## Testing Your Changes

Before submitting a PR, make sure to:

1. Run the full test suite: `npm test`
2. Try your changes with real examples: `npm run checkmate -- <your-command>`
3. Verify that existing functionality still works
4. Check for any lint issues: `npm run lint`

## Creating a Release

For maintainers creating a new release:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag: `git tag v1.x.x`
4. Push the tag: `git push origin v1.x.x`
5. Run: `npm publish`

## Common Issues and Solutions

### OpenAI API Issues

If you encounter issues with the OpenAI API:

1. Check that your API key is correct
2. Verify you have sufficient API credits
3. Check for rate limiting issues
4. Try a different model

### Terminal Display Issues

If the terminal UI doesn't display correctly:

1. Check that your terminal supports color and Unicode
2. Try with `--no-color` flag
3. Update to the latest version of your terminal emulator

## Next Steps

- [Home](Home.md) - Return to the main wiki page
- [Command Reference](Command-Reference.md) - Explore all available commands
- [Advanced Features](wiki/Advanced-Features.md) - Learn about power user features 