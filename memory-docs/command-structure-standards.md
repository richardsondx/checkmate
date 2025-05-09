# CheckMate CLI Command Structure Standards

## Current Command Patterns Analysis

After analyzing the current CheckMate CLI commands, we've identified inconsistencies in how parameters are handled:

### Positional Parameters (Noun-based commands)
Commands that use positional parameters for their primary target:
- `checkmate gen <description>`
- `checkmate clarify <slug>`
- `checkmate reset <spec-slug>`
- `checkmate scaffold <path>`

### Option Flags (Action-based commands)
Commands that use option flags (--flag) for their primary target:
- `checkmate list-checks --spec <slug>`
- `checkmate verify-llm-reasoning --spec <slug> --check-id <id> ...`
- `checkmate status --target <slug>`
- `checkmate promote --spec <slug>`

## Parameter Naming Inconsistencies

We've also identified inconsistencies in parameter naming:

1. **Spec Reference Inconsistency**:
   - `--spec` in list-checks, verify-llm-reasoning, promote
   - `--target` in status
   - Different positional parameter names: `<slug>`, `<spec-slug>`, etc.

2. **Flag Format Inconsistency**:
   - Some commands use short flags (`-s, --spec`)
   - Others only have long flags (`--spec`)

3. **Interactive Mode Inconsistency**:
   - Some commands use `-i, --interactive`
   - Others only have `--interactive`

## Command Design Principles Going Forward

To ensure consistency and usability, we'll follow these principles:

### 1. Command Structure

1. **Primary Target Pattern**:
   - If a command operates on a single, required entity (like a spec slug), use a positional parameter
   - Example: `checkmate <command> <primary-target>`

2. **Multiple Required Parameters Pattern**:
   - If a command requires multiple parameters that are all essential, use named option flags
   - Example: `checkmate verify-llm-reasoning --spec <slug> --check-id <id> ...`

3. **Optional Parameters Pattern**:
   - Always use named option flags for optional parameters
   - Example: `checkmate <command> <primary-target> --option1 <value> --option2 <value>`

4. **Command Naming**:
   - Use noun-verb format (e.g., `spec-create`) for actions on entities
   - Use verb-noun format (e.g., `list-checks`) for query/read operations

### 2. Parameter Naming Standards

1. **Spec Reference Standard**:
   - Always use `spec` as the parameter name for specification references
   - For positional parameters: `<spec>` (not `<slug>` or `<spec-slug>`)
   - For option flags: `--spec` (not `--target` or other variations)

2. **Abbreviated Flag Standard**:
   - Provide short versions for commonly used flags
   - Common short flags:
     - `-s, --spec` for specification references
     - `-i, --interactive` for interactive mode
     - `-f, --format` for output format
     - `-q, --quiet` for quiet mode
     - `-j, --json` for JSON output

3. **Boolean Flag Naming**:
   - Use positive verbs for boolean flags (e.g., `--interactive` not `--no-interactive`)
   - For toggles, use the positive form as default and prefix with `--no-` for the negative

## Recommended Changes for Consistency

To align with these principles, we should update the following commands:

1. **list-checks**: 
   - Current: `checkmate list-checks --spec <slug>`
   - Recommended: `checkmate list-checks <spec>` 
   - Keep `--spec` flag as an alternative for backward compatibility

2. **status**:
   - Current: `checkmate status --target <slug>`
   - Recommended: `checkmate status <spec>` 
   - Rename flag from `--target` to `--spec` for consistency
   - Keep `--target` as an alias for backward compatibility

3. **clarify**:
   - Current: `checkmate clarify <slug>`
   - Recommended: `checkmate clarify <spec>`
   - Update help text to use "spec" terminology

4. **reset**:
   - Current: `checkmate reset <spec-slug>`
   - Recommended: `checkmate reset <spec>`
   - Update help text for consistency

5. **promote**:
   - Current: Has `-s, --spec` flag but inconsistent with other commands
   - Already follows best practices

## Implementation Guide for Future Commands

When implementing new CheckMate CLI commands:

1. **Single Primary Target Commands**:
   ```typescript
   .command(
     'command-name <spec>',
     'Description of the command', 
     (yargs: Argv) => {
       return yargs
         .positional('spec', {
           describe: 'Spec name or path',
           type: 'string',
           demandOption: true
         })
         .option('option1', {
           describe: 'Description of option1',
           type: 'string'
         });
     },
     async (argv: any) => {
       // Implementation
     }
   )
   ```

2. **Multiple Required Parameters Commands**:
   ```typescript
   .command(
     'command-name',
     'Description of the command', 
     (yargs: Argv) => {
       return yargs
         .option('spec', {
           describe: 'Spec name or path',
           type: 'string',
           demandOption: true,
           alias: 's'
         })
         .option('param2', {
           describe: 'Description of param2',
           type: 'string',
           demandOption: true
         });
     },
     async (argv: any) => {
       // Implementation
     }
   )
   ```

3. **Common Flag Guidelines**:
   ```typescript
   // Format options
   .option('format', {
     describe: 'Output format',
     type: 'string',
     choices: ['json', 'text', 'yaml'],
     default: 'text',
     alias: 'f'
   })
   
   // JSON output shortcut
   .option('json', {
     describe: 'Output as JSON',
     type: 'boolean',
     default: false,
     alias: 'j'
   })
   
   // Interactive mode
   .option('interactive', {
     describe: 'Use interactive mode',
     type: 'boolean',
     default: false,
     alias: 'i'
   })
   
   // Quiet mode
   .option('quiet', {
     describe: 'Suppress output',
     type: 'boolean',
     default: false,
     alias: 'q'
   })
   ```

## Backward Compatibility

When updating command structures for consistency:

1. Support both patterns during transition (e.g., both positional and --flag)
2. Mark the old pattern as deprecated in help text
3. Plan for removal of deprecated patterns in a future version

## Example: Supporting Both Patterns

```typescript
.command(
  'list-checks [spec]',  
  'List all check items for a spec', 
  (yargs: Argv) => {
    return yargs
      .positional('spec', {
        describe: 'Spec name or path',
        type: 'string'
      })
      .option('spec', {  
        describe: 'Spec name or path (alternative to positional parameter)',
        type: 'string',
        alias: 's'
      })
      .check((argv) => {
        if (!argv.spec && !argv._[1]) {
          throw new Error('Spec name or path is required');
        }
        return true;
      });
  },
  async (argv: any) => {
    const specName = argv._[1] || argv.spec;
    // Implementation using specName
  }
)
``` 