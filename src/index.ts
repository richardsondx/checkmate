#!/usr/bin/env node

/**
 * CheckMate CLI
 * Plain-English specs that live in Git and block "Done" until every box turns green
 */

import * as path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { printBanner, printBox } from './ui/banner.js';
import * as configCommands from './commands/config.js';
import * as treeCommands from './commands/tree.js';
import * as genCommands from './commands/gen.js';
import * as affectedCommands from './commands/affected.js';
import * as watchCommands from './commands/watch.js';
import * as createCommands from './commands/create.js';
import * as cleanCommands from './commands/clean.js';
import * as scaffoldCommands from './commands/scaffold.js';
import * as specs from './lib/specs.js';
import { Argv } from 'yargs';
import * as modelCommands from './commands/model.js';
import * as promoteCommands from './commands/promote.js';
import * as snapCommands from './commands/snap.js';
import * as draftCommands from './commands/draft.js';
import * as saveCommands from './commands/save.js';
import * as autoFilesCommands from './commands/auto-files.js';
import * as featuresCommands from './commands/features.js';
import * as statusCommands from './commands/status.js';
import * as testCommands from './commands/test.js';
import * as clarifyCommands from './commands/clarify.js';
import chalk from 'chalk';
import * as listChecksCommands from './commands/list-checks.js';
import * as verifyLlmReasoningCommands from './commands/verify-llm-reasoning.js';
import * as resetCommandModule from './commands/reset.js';
import * as runScriptCommands from './commands/run-script.js';

// Initialize yargs parser
const yargsInstance = yargs(hideBin(process.argv));

// Only show welcome banner on init command or when no command is specified
const command = process.argv.length > 2 ? process.argv[2] : null;
const showBannerCommands = ['init', null, 'help', '--help', '-h'];
if (showBannerCommands.includes(command)) {
  printBanner();
}

// Parse command line arguments
yargsInstance
  // Init command
  .command('init', 'Initialize CheckMate in the current project', {}, () => {
    configCommands.init();
  })
  
  // Config commands
  .command('config', 'Show current configuration', {}, () => {
    configCommands.show();
  })
  .command(
    'model set <slot> <n>',
    'Set model for a specific slot', 
    (yargs: Argv) => {
      return yargs
        .positional('slot', {
          describe: 'Model slot (reason|quick)',
          choices: ['reason', 'quick'],
          type: 'string',
          demandOption: true
        })
        .positional('name', {
          describe: 'Model name',
          type: 'string',
          demandOption: true
        });
    }, 
    (argv: any) => {
      configCommands.setModel(argv.slot as 'reason' | 'quick', argv.name);
    }
  )
  .command(
    'set-anthropic-key <key>',
    'Set Anthropic API key for Claude models', 
    (yargs: Argv) => {
      return yargs
        .positional('key', {
          describe: 'Anthropic API key or env:VARIABLE_NAME reference',
          type: 'string',
          demandOption: true
        });
    }, 
    (argv: any) => {
      configCommands.setAnthropicKey(argv.key);
    }
  )
  .command(
    'log <mode>',
    'Set log mode', 
    (yargs: Argv) => {
      return yargs
        .positional('mode', {
          describe: 'Log mode (on|off|optional)',
          choices: ['on', 'off', 'optional'],
          type: 'string',
          demandOption: true
        });
    }, 
    (argv: any) => {
      configCommands.setLogMode(argv.mode as 'on' | 'off' | 'optional');
    }
  )
  
  // LLM-DRIVEN TDD COMMANDS & CORE WORKFLOW
  .command(
    'gen <description>',
    'Generate a new spec from a description', 
    (yargs: Argv) => {
      return yargs
        .positional('description', {
          describe: 'Description of the feature to generate a spec for',
          type: 'string',
          demandOption: true
        })
        .option('all-files', {
          describe: 'Scan all file types, not just code files',
          type: 'boolean',
          default: false
        })
        .option('dry-run', {
          describe: 'Generate the spec but do not write it to disk',
          type: 'boolean',
          default: false
        })
        .option('no-test', {
          describe: 'Do not generate test code for requirements',
          type: 'boolean',
          default: false
        })
        .option('open', {
          describe: 'Open the generated spec in your editor',
          type: 'boolean',
          default: false
        })
        .option('agent', {
          describe: 'Generate a YAML agent spec instead of Markdown',
          type: 'boolean',
          default: false
        })
        .option('type', {
          describe: 'Type of specification to generate (A or B)',
          type: 'string',
          choices: ['A', 'B']
        })
        .option('interactive', {
          describe: 'Use interactive mode to review and edit spec generation',
          type: 'boolean',
          alias: 'i',
          default: false
        })
        .option('yes', {
          describe: 'Skip all prompts and create spec with default options',
          type: 'boolean',
          alias: 'y',
          default: false
        })
        .option('non-interactive', {
          describe: 'Run in non-interactive mode (skip all prompts)',
          type: 'boolean',
          default: false
        })
        .option('files', {
          describe: 'Explicitly specify files to include (glob patterns allowed)',
          type: 'array'
        });
    },
    async (argv: any) => {
      await genCommands.genCommand({
        name: argv.description,
        description: argv.description,
        type: argv.type,
        output: argv.output,
        interactive: argv.interactive,
        files: argv.files,
        agent: argv.agent,
        yes: argv.yes,
        nonInteractive: argv.nonInteractive
      });
    }
  )
  .command(
    'warmup [prdFile]',
    'Scan a repository or PRD and suggest/create specs',
    (yargs: Argv) => {
      return yargs
        .positional('prdFile', {
          describe: 'Path to a PRD markdown file to generate specs from',
          type: 'string'
        })
        .option('output', {
          describe: 'Output format (json, yaml, or table)',
          type: 'string',
          choices: ['json', 'yaml', 'table'],
          default: 'yaml'
        })
        .option('top-files', {
          describe: 'Number of top files to include in analysis',
          type: 'number',
          default: 100
        })
        .option('model', {
          describe: 'Model to use for analysis',
          type: 'string'
        })
        .option('yes', {
          describe: 'Save all specs without interactive selection',
          type: 'boolean',
          default: false,
          alias: 'y'
        })
        .option('interactive', {
          describe: 'Use interactive mode for selection',
          type: 'boolean',
          default: true
        })
        .option('quiet', {
          describe: 'Suppress banner and spinner output',
          type: 'boolean',
          default: false,
          alias: 'q'
        })
        .option('debug', {
          describe: 'Show debug information including meta hashes',
          type: 'boolean',
          default: false
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('rewrite', {
          describe: 'Rewrite existing specs with consistent bullets',
          type: 'boolean',
          default: false
        })
        .option('prd', {
          describe: 'Path to a PRD markdown file (alternative to positional arg)',
          type: 'string'
        });
    },
    async (argv: any) => {
      const warmupModule = await import('./commands/warmup.js');
      // If prd is provided via option, prefer that over positional arg
      if (argv.prd && !argv._[1]) {
        argv._[1] = argv.prd;
      }
      await warmupModule.warmupCommand(warmupModule.parseWarmupArgs(argv));
    }
  )
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
        .option('format', {
          describe: 'Output format',
          type: 'string',
          choices: ['json', 'text'],
          default: 'text',
          alias: 'f'
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('quiet', {
          describe: 'Suppress all output (useful for programmatic access)',
          type: 'boolean',
          default: false,
          alias: 'q'
        })
        .check((argv) => {
          // Ensure at least one form of spec is provided
          if (!argv.spec && !argv._[1]) {
            throw new Error('Spec name or path is required');
          }
          return true;
        });
    },
    async (argv: any) => {
      // Use positional parameter if provided, otherwise use --spec option
      const specName = argv._[1] || argv.spec;
      await listChecksCommands.listChecksCommand({
        spec: specName,
        format: argv.format,
        cursor: argv.cursor,
        quiet: argv.quiet
      });
    }
  )
  .command(
    'verify-llm-reasoning',
    'Verify LLM\'s logical reasoning for a check item', 
    (yargs: Argv) => {
      return yargs
        .option('spec', {
          describe: 'Spec name or path',
          type: 'string',
          demandOption: true,
          alias: 's'
        })
        .option('check-id', {
          describe: 'ID of the specific check item to verify',
          type: 'string',
          demandOption: true,
          alias: 'c'
        })
        .option('success-condition', {
          describe: 'LLM\'s defined success condition',
          type: 'string',
          demandOption: true
        })
        .option('failure-condition', {
          describe: 'LLM\'s defined failure condition',
          type: 'string',
          demandOption: true
        })
        .option('outcome-report', {
          describe: 'LLM\'s observation/outcome report',
          type: 'string',
          demandOption: true,
          alias: 'o'
        })
        .option('explanation-file', {
          describe: 'File to write explanation to if verification fails',
          type: 'string',
          alias: 'e'
        })
        .option('debug', {
          describe: 'Show debug information including prompts',
          type: 'boolean',
          default: false,
          alias: 'd'
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('quiet', {
          describe: 'Suppress all output (useful for programmatic access)',
          type: 'boolean',
          default: false,
          alias: 'q'
        });
    },
    async (argv: any) => {
      await verifyLlmReasoningCommands.verifyLlmReasoningCommand({
        spec: argv.spec,
        checkId: argv.checkId,
        successCondition: argv.successCondition,
        failureCondition: argv.failureCondition,
        outcomeReport: argv.outcomeReport,
        explanationFile: argv.explanationFile,
        debug: argv.debug,
        cursor: argv.cursor,
        quiet: argv.quiet
      });
    }
  )
  .command(
    'features',
    'List features from last warmup or discovered in the codebase',
    (yargs: Argv) => {
      return yargs
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false
        })
        .option('search', {
          describe: 'Filter features by search term',
          type: 'string',
          alias: 's'
        })
        .option('type', {
          describe: 'Filter by spec type (USER or AGENT)',
          type: 'string',
          choices: ['USER', 'AGENT']
        })
        .option('status', {
          describe: 'Filter by status (PASS, FAIL, STALE, UNKNOWN)',
          type: 'string',
          choices: ['PASS', 'FAIL', 'STALE', 'UNKNOWN']
        })
        .option('pass', {
          describe: 'Show only passing features',
          type: 'boolean',
          default: false
        })
        .option('fail', {
          describe: 'Show only failing features',
          type: 'boolean',
          default: false
        })
        .option('stale', {
          describe: 'Show only stale features',
          type: 'boolean',
          default: false
        })
        .option('interactive', {
          describe: 'Enable interactive mode for selection',
          type: 'boolean'
        })
        .option('analyze', {
          describe: 'Analyze codebase to identify features directly',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      await featuresCommands.featuresCommand({
        json: argv.json,
        search: argv.search,
        type: argv.type,
        status: argv.status,
        interactive: argv.interactive,
        fail: argv.fail,
        pass: argv.pass,
        stale: argv.stale,
        analyze: argv.analyze
      });
    }
  )
  .command(
    'status [spec]', 
    'Check status of a specific spec', 
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
        .option('target', {
          describe: 'Spec to check status for (deprecated, use --spec instead)',
          type: 'string',
          alias: 't',
          hidden: true
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false,
          alias: 'j'
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('quiet', {
          describe: 'Suppress banner and detailed output',
          type: 'boolean',
          default: false,
          alias: 'q'
        })
        .check((argv) => {
          // Ensure at least one form of spec/target is provided
          if (!argv.spec && !argv.target && !argv._[1]) {
            throw new Error('Spec name or path is required');
          }
          return true;
        });
    }, 
    async (argv: any) => {
      // Import dynamically to avoid circular dependencies
      const statusModule = await import('./commands/status.js');
      // Use positional parameter, --spec option, or fallback to --target option
      const specName = argv._[1] || argv.spec || argv.target;
      // Call the status command function explicitly
      await statusModule.statusCommand({ 
        target: specName, // Pass as target for backward compatibility with statusCommand
        cursor: argv.cursor || false,
        json: argv.json || false,
        quiet: argv.quiet || false
      });
    })
  .command(
    'clarify <spec>',
    'Explain why a requirement is failing and suggest fixes',
    (yargs: Argv) => {
      return yargs
        .positional('spec', {
          describe: 'Spec name or path to analyze',
          type: 'string',
          demandOption: true
        })
        .option('bullet', {
          describe: 'Bullet number of the requirement to analyze',
          type: 'number'
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false,
          alias: 'j'
        });
    },
    async (argv: any) => {
      const clarifyModule = await import('./commands/clarify.js');
      await clarifyModule.clarifyCommand(clarifyModule.parseClarifyArgs(argv));
    }
  )
  .command(
    'reset <spec>',
    'Reset the status of a spec back to unchecked',
    (yargs: Argv) => {
      return yargs
        .positional('spec', {
          describe: 'Spec name or path to reset',
          type: 'string',
          demandOption: true
        });
    },
    async (argv: any) => {
      // Implementation of reset command
      await resetCommandModule.resetCommand({ specName: argv.spec, quiet: argv.quiet });
    }
  )
  
  // SUPPORTING & UTILITY COMMANDS
  .command(
    'find <query>',
    'Find specs based on their content using AI',
    (yargs: Argv) => {
      return yargs
        .positional('query', {
          describe: 'Description to search for in specs',
          type: 'string',
          demandOption: true
        })
        .option('quiet', {
          describe: 'Suppress detailed output',
          type: 'boolean',
          default: false,
          alias: 'q'
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false,
          alias: 'j'
        });
    },
    async (argv: any) => {
      // Import dynamically to avoid circular dependencies
      const findModule = await import('./commands/find.js');
      await findModule.findCommand({
        query: argv.query,
        quiet: argv.quiet || false,
        cursor: argv.cursor || false,
        json: argv.json || false
      });
    }
  )
  .command(
    'specs', 
    'List all spec files', 
    {},
    () => {
      specs.listSpecs();
    }
  )
  .command(
    'affected',
    'Show specs affected by changes', 
    (yargs: Argv) => {
      return yargs
        .option('base', {
          describe: 'Git diff base (default: HEAD if in git repo)',
          type: 'string'
        })
        .option('json', {
          describe: 'Output as JSON array of spec slugs',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      await affectedCommands.findAffectedSpecs({
        base: argv.base,
        json: argv.json
      });
    }
  )
  .command(
    'watch',
    'Start a live dashboard that monitors test runs',
    (yargs: Argv) => {
      return yargs
        .option('filter', {
          describe: 'Filter specs by name (case-insensitive substring match)',
          type: 'string',
          alias: 'f'
        })
        .option('type', {
          describe: 'Filter specs by type (USER or AGENT)',
          type: 'string',
          choices: ['USER', 'AGENT', 'user', 'agent']
        })
        .option('status', {
          describe: 'Filter specs by status (PASS or FAIL)',
          type: 'string',
          choices: ['PASS', 'FAIL', 'pass', 'fail']
        })
        .option('limit', {
          describe: 'Maximum number of specs to display',
          type: 'number',
          default: 10
        })
        .option('spec', {
          describe: 'Watch a specific spec, optionally until it passes',
          type: 'string',
          alias: 's'
        })
        .option('until-pass', {
          describe: 'Watch the specified spec until it passes',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      await watchCommands.watch({
        filter: argv.filter,
        typeFilter: argv.type?.toUpperCase(),
        statusFilter: argv.status?.toUpperCase(),
        limit: argv.limit,
        spec: argv.spec,
        untilPass: argv.untilPass
      });
    }
  )
  .command(
    'stats',
    'Show token usage and cost statistics', 
    (yargs: Argv) => {
      return yargs
        .option('since', {
          describe: 'Show stats since timeframe (e.g., 24h, 7d)',
          type: 'string',
          alias: 's'
        })
        .option('session', {
          describe: 'Show stats for specific session ID',
          type: 'string',
          alias: 'id'
        })
        .option('all', {
          describe: 'Show stats for all sessions',
          type: 'boolean',
          alias: 'a'
        })
        .option('json', {
          describe: 'Output in JSON format',
          type: 'boolean',
          default: false
        })
        .option('detailed', {
          describe: 'Show detailed breakdown of each API request',
          type: 'boolean',
          default: false,
          alias: 'd'
        });
    }, 
    async () => {
      // Import dynamically to avoid circular dependencies
      await import('./commands/stats.js');
    }
  )
  .command(
    'scaffold <path>',
    'Create a spec scaffold with the new YAML format',
    (yargs: Argv) => {
      return yargs
        .positional('path', {
          describe: 'Path for the spec file (or base name without extension)',
          type: 'string',
          demandOption: true
        })
        .option('title', {
          describe: 'Title for the spec',
          type: 'string'
        })
        .option('file', {
          describe: 'Files to include in the spec (can be specified multiple times)',
          type: 'array'
        })
        .option('require', {
          describe: 'Requirements to include (can be specified multiple times)',
          type: 'array'
        })
        .option('output', {
          describe: 'Output file path (default: checkmate/specs/[slug].yaml)',
          type: 'string'
        })
        .option('open', {
          describe: 'Open the generated spec in your editor',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      const options = scaffoldCommands.parseScaffoldArgs(argv);
      await scaffoldCommands.scaffoldSpec(argv.path, options);
    }
  )
  .command(
    'clean',
    'Clean the cache by removing entries for deleted specs',
    (yargs: Argv) => {
      return yargs
        .option('force', {
          describe: 'Force clean all cache entries regardless of existing specs',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      if (argv.force) {
        await cleanCommands.forceCleanCache();
      } else {
        await cleanCommands.cleanCache();
      }
    }
  )
  .command(
    'run-script <script-name> [args...]',
    'Run a script from the CheckMate scripts directory with proper path resolution',
    (yargs: Argv) => {
      return yargs
        .positional('script-name', {
          describe: 'Name of the script to run (with or without .js extension)',
          type: 'string',
          demandOption: true
        })
        .positional('args', {
          describe: 'Arguments to pass to the script',
          type: 'string',
          array: true
        })
        .option('quiet', {
          describe: 'Suppress informational output about the script execution',
          type: 'boolean',
          default: false,
          alias: 'q'
        });
    },
    async (argv: any) => {
      const exitCode = await runScriptCommands.runScriptCommand({
        scriptName: argv['script-name'],
        args: argv.args || [],
        quiet: argv.quiet
      });
      
      // Exit with the same code as the script
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    }
  )
  .command(
    'test', 
    'Test the AI model integration', 
    (yargs: Argv) => {
      return yargs
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false
        })
        .option('quiet', {
          describe: 'Suppress banner and detailed output',
          type: 'boolean',
          default: false
        });
    }, 
    async (argv: any) => {
      // Import dynamically to avoid circular dependencies
      const testModule = await import('./commands/test.js');
      // Call the test command function
      await testModule.testCommand({ 
        cursor: argv.cursor || false,
        json: argv.json || false,
        quiet: argv.quiet || false
      });
    }
  )
  .command(
    'setup-mcp', 
    'Set up CheckMate as a Cursor MCP server', 
    {},
    async () => {
      // Import dynamically to avoid circular dependencies
      const setupModule = await import('./commands/setup-mcp.js');
      // The setup module has a self-executing function
    }
  )
  .command({
    command: 'model <command>',
    describe: 'Manage AI models',
    builder: (yargs: Argv) => {
      return yargs
        .command({
          command: 'list',
          describe: 'List configured models',
          handler: () => {
            modelCommands.listModels();
          }
        })
        .command({
          command: 'info',
          describe: 'Show detailed information about model slots',
          handler: () => {
            modelCommands.printModelInfo();
          }
        })
        .command({
          command: 'set <slot> <n>',
          describe: 'Set a model for a specific slot',
          builder: (yargs: Argv) => {
            return yargs
              .positional('slot', {
                describe: 'Model slot (reason|quick)',
                choices: ['reason', 'quick'],
                type: 'string',
                demandOption: true
              })
              .positional('name', {
                describe: 'Model name (e.g., gpt-4o, gpt-4o-mini)',
                type: 'string',
                demandOption: true
              });
          },
          handler: (argv: any) => {
            modelCommands.setModel(argv.slot as 'reason' | 'quick', argv.name);
          }
        })
        .demandCommand(1, 'You need to specify a valid model subcommand')
        .help();
    },
    handler: () => {}
  })

// Ensure the default command and final setup are at the end
.command('$0', 'Show help', {}, () => {
  yargsInstance.showHelp();
})
.demandCommand()
.strict()
.help()
.parse(); 