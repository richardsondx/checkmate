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
import * as runCommands from './commands/run.js';
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
    // Always show banner for init
    printBanner();
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
  
  // Tree commands
  .command('files', 'List all code files in the project', 
    (yargs: Argv) => {
      return yargs
        .option('ext', {
          describe: 'File extensions to include',
          type: 'array',
          default: ['ts', 'js', 'tsx', 'jsx']
        });
    },
    async (argv: any) => {
      await treeCommands.listFiles(argv.ext);
    }
  )
  .command('dirs', 'List directories containing code files', {}, 
    async () => {
      await treeCommands.listDirectories();
    }
  )
  
  // USER COMMANDS - Specification Creation
  .command(
    'gen <description>',
    '[USER] Generate a new spec from a description', 
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
        agent: argv.agent
      });
    }
  )
  .command('specs', 'List all spec files', {}, () => {
    specs.listSpecs();
  })
  
  // USER COMMANDS - Specification Creation (Alternative methods)
  .command(
    'scaffold <path>',
    '[USER] Create a spec scaffold with the new YAML format',
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
  
  // USER COMMANDS - Create from existing content
  .command(
    'create',
    '[USER] Create a spec from JSON payload or PRD file',
    (yargs: Argv) => {
      return yargs
        .option('json', {
          describe: 'JSON payload with feature description and optional files',
          type: 'string'
        })
        .option('prd', {
          describe: 'Path to a markdown PRD file to extract features from',
          type: 'string'
        })
        .option('update', {
          describe: 'Update an existing spec by slug',
          type: 'string'
        })
        .option('agent', {
          describe: 'Create a YAML agent spec in the agents folder',
          type: 'boolean',
          default: false
        })
        .check((argv) => {
          const hasOptions = argv.json || argv.prd || argv.update;
          if (!hasOptions) {
            throw new Error('One of --json, --prd, or --update is required');
          }
          return true;
        });
    },
    async (argv: any) => {
      await createCommands.handleCreate({
        json: argv.json,
        prd: argv.prd,
        update: argv.update,
        agent: argv.agent
      });
    }
  )
  
  // USER COMMANDS - Draft & Save (Two-step creation process)
  .command(
    'draft',
    '[USER] Generate draft specifications without writing to disk',
    (yargs: Argv) => {
      return yargs
        .option('description', {
          describe: 'Description of features to generate specs for',
          type: 'string',
          demandOption: true,
          alias: 'd'
        })
        .option('context', {
          describe: 'Number of relevant files to include for context (default: 50)',
          type: 'number',
          default: 50
        })
        .option('return', {
          describe: 'Format to return drafts in (md, yaml, both)',
          type: 'string',
          choices: ['md', 'yaml', 'both'],
          default: 'md'
        })
        .option('json', {
          describe: 'Output as JSON (always on for programmatic use)',
          type: 'boolean',
          default: true,
          hidden: true
        });
    },
    async (argv: any) => {
      const drafts = await draftCommands.draftCommand({
        description: argv.description,
        context: argv.context,
        return: argv.return
      });
      
      // Always output as JSON
      console.log(draftCommands.formatDraftsAsJson(drafts));
    }
  )
  
  .command(
    'save',
    '[USER] Save approved draft specifications to disk',
    (yargs: Argv) => {
      return yargs
        .option('json', {
          describe: 'JSON draft specifications to save',
          type: 'string',
          demandOption: true
        })
        .option('format', {
          describe: 'Format to save specs in (md, yaml, both)',
          type: 'string',
          choices: ['md', 'yaml', 'both'],
          default: 'md'
        })
        .option('force', {
          describe: 'Save all specs even if not approved',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      const result = await saveCommands.saveCommand({
        json: argv.json,
        format: argv.format,
        force: argv.force
      });
      
      console.log(JSON.stringify(result));
    }
  )
  
  // USER COMMANDS - Testing & Validation
  .command(
    'run',
    '[USER] Run all checks for all specs', 
    (yargs: Argv) => {
      return yargs
        .option('noreset', {
          describe: 'Don\'t reset requirements after a successful run',
          type: 'boolean',
          default: false
        })
        .option('target', {
          describe: 'Run only specific specs (comma-separated names or paths)',
          type: 'string'
        })
        .option('type', {
          describe: 'Run only specs of a certain type (A or B)',
          type: 'string',
          choices: ['A', 'B']
        })
        .option('fail-early', {
          describe: 'Stop execution on the first failing requirement',
          type: 'boolean',
          default: false
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      const reset = !argv.noreset;
      
      await runCommands.runCommand({
        target: argv.target,
        reset: reset,
        all: !argv.target && !argv.type,
        type: argv.type,
        failEarly: argv.failEarly || false,
        cursor: argv.cursor || false
      });
    }
  )
  .command(
    'next [spec]',
    '[USER] Run the next unchecked requirement in a spec', 
    (yargs: Argv) => {
      return yargs
        .positional('spec', {
          describe: 'Spec name or path (defaults to first spec with unchecked items)',
          type: 'string'
        });
    },
    async (argv: any) => {
      if (argv.spec) {
        // Run next for the specified spec
        const specPath = specs.getSpecByName(argv.spec);
        
        if (!specPath) {
          console.error(`Spec not found: ${argv.spec}`);
          process.exit(1);
        }
        
        await runCommands.runCommand({ target: argv.spec });
      } else {
        // Find the first spec with unchecked requirements
        const specFiles = specs.listSpecs();
        
        if (specFiles.length === 0) {
          console.log('No spec files found. Generate one with "checkmate gen".');
          process.exit(0);
        }
        
        let foundUnchecked = false;
        
        for (const specFile of specFiles) {
          const parsedSpec = specs.parseSpec(specFile);
          const hasUnchecked = parsedSpec.requirements.some(req => !req.status);
          
          if (hasUnchecked) {
            console.log(`Found unchecked requirements in ${path.basename(specFile)}`);
            await runCommands.runCommand({ target: specFile });
            foundUnchecked = true;
            break;
          }
        }
        
        if (!foundUnchecked) {
          console.log('No unchecked requirements found in any spec.');
          process.exit(0);
        }
      }
    }
  )
  
  // USER COMMANDS - Monitoring & Analysis
  .command(
    'affected',
    '[USER] Show specs affected by changes', 
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
  
  // USER COMMANDS - Live Monitoring
  .command(
    'watch',
    '[USER] Start a live dashboard that monitors test runs',
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
  
  // USER COMMANDS - Maintenance
  .command(
    'clean',
    '[USER] Clean the cache by removing entries for deleted specs',
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
  
  // USER COMMANDS - Status Check
  .command('status', '[USER] Check status of a specific spec', 
    (yargs: Argv) => {
      return yargs
        .option('target', {
          describe: 'Spec to check status for (name or path)',
          type: 'string',
          demandOption: true,
          alias: 't'
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
          default: false
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
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
      const statusModule = await import('./commands/status.js');
      // Call the status command function explicitly
      await statusModule.statusCommand({ 
        target: argv.target,
        cursor: argv.cursor || false,
        json: argv.json || false,
        quiet: argv.quiet || false
      });
    })
  
  // SYSTEM COMMANDS - Testing
  .command('test', '[SYSTEM] Test the AI model integration', 
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
    })
  
  // SYSTEM COMMANDS - Setup
  .command('setup-mcp', '[SYSTEM] Set up CheckMate as a Cursor MCP server', {}, async () => {
    // Import dynamically to avoid circular dependencies
    const setupModule = await import('./commands/setup-mcp.js');
    // The setup module has a self-executing function
  })
  
  // SYSTEM COMMANDS - Model Management
  .command({
    command: 'model <command>',
    describe: '[SYSTEM] Manage AI models',
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
  
  // AGENT COMMANDS - Promotion from user to agent spec
  .command(
    'promote',
    '[AGENT] Promote a Markdown spec to a YAML agent spec',
    (yargs: Argv) => {
      return yargs
        .option('spec', {
          describe: 'Markdown spec to convert to a YAML agent spec',
          type: 'string',
          demandOption: true,
          alias: 's'
        })
        .option('selected-only', {
          describe: 'Only promote requirements that are failing (not checked)',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      await promoteCommands.promoteCommand({
        spec: argv.spec,
        selectedOnly: argv.selectedOnly
      });
    }
  )
  
  // SYSTEM COMMANDS - Advanced File Management
  .command(
    'snap',
    '[SYSTEM] Manage file snapshots and detect renames',
    (yargs: Argv) => {
      return yargs
        .option('detect', {
          describe: 'Detect renamed files',
          type: 'boolean',
          default: false
        })
        .option('repair', {
          describe: 'Repair specs with renamed files',
          type: 'boolean',
          default: false
        })
        .option('auto', {
          describe: 'Automatically apply all repairs without prompting',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      await snapCommands.snapCommand({
        detect: argv.detect,
        repair: argv.repair,
        auto: argv.auto
      });
    }
  )
  
  // USER COMMANDS - Project Analysis
  .command(
    'warmup',
    '[USER] Scan a repository and suggest specs for existing code',
    (yargs: Argv) => {
      return yargs
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
        });
    },
    async (argv: any) => {
      const warmupModule = await import('./commands/warmup.js');
      await warmupModule.warmupCommand(warmupModule.parseWarmupArgs(argv));
    }
  )
  
  // USER COMMANDS - File Management
  .command(
    'auto-files',
    '[USER] Manage automatic file discovery for specs',
    (yargs: Argv) => {
      return yargs
        .option('enable', {
          describe: 'Enable auto-file discovery for specs',
          type: 'boolean',
          default: false
        })
        .option('update', {
          describe: 'Update files for specs using auto-discovery',
          type: 'boolean',
          default: false
        })
        .option('spec', {
          describe: 'Specific spec to process',
          type: 'string'
        })
        .option('all', {
          describe: 'Process all specs',
          type: 'boolean',
          default: false
        })
        .check((argv) => {
          if (!argv.spec && !argv.all) {
            throw new Error('Either --spec or --all is required');
          }
          if (!argv.enable && !argv.update) {
            throw new Error('At least one of --enable or --update is required');
          }
          return true;
        });
    },
    async (argv: any) => {
      await autoFilesCommands.autoFilesCommand(
        autoFilesCommands.parseAutoFilesArgs(argv)
      );
    }
  )
  
  // USER COMMANDS - Analysis & Explanation
  .command(
    'clarify <slug>',
    '[USER] Explain why a requirement is failing and suggest fixes',
    (yargs: Argv) => {
      return yargs
        .positional('slug', {
          describe: 'Slug of the spec to analyze',
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
          default: false
        });
    },
    async (argv: any) => {
      const clarifyModule = await import('./commands/clarify.js');
      await clarifyModule.clarifyCommand(clarifyModule.parseClarifyArgs(argv));
    }
  )
  
  // USER COMMANDS - Implementation Analysis
  .command(
    'outline',
    '[USER] Generate a pseudocode outline of implementation and compare with spec',
    (yargs: Argv) => {
      return yargs
        .option('spec', {
          describe: 'Spec to analyze (name or path)',
          type: 'string',
          alias: 's'
        })
        .option('files', {
          describe: 'Files to analyze (glob patterns allowed)',
          type: 'array',
          alias: 'f'
        })
        .option('diff', {
          describe: 'Generate diff report comparing spec with implementation',
          type: 'boolean',
          default: false,
          alias: 'd'
        })
        .option('depth', {
          describe: 'Summarization depth (1-3)',
          type: 'number',
          default: 2
        })
        .option('format', {
          describe: 'Output format for diff report',
          type: 'string',
          choices: ['json', 'markdown'],
          default: 'markdown'
        })
        .option('auto', {
          describe: 'Auto-detect spec from current context',
          type: 'boolean',
          default: false,
          alias: 'a'
        })
        .option('audit', {
          describe: 'Treat conflicts as failures in CI/CD',
          type: 'boolean',
          default: false
        })
        .option('quiet', {
          describe: 'Suppress detailed output',
          type: 'boolean',
          default: false,
          alias: 'q'
        })
        .check((argv) => {
          if (!argv.spec && !argv.auto && !argv.files) {
            throw new Error('Either --spec, --auto, or --files is required');
          }
          return true;
        });
    },
    async (argv: any) => {
      const outlineModule = await import('./commands/outline.js');
      await outlineModule.outlineCommand({
        spec: argv.spec,
        files: argv.files,
        diff: argv.diff,
        depth: argv.depth,
        format: argv.format as 'json' | 'markdown',
        auto: argv.auto,
        audit: argv.audit,
        quiet: argv.quiet
      });
    }
  )
  
  // USER COMMANDS - Spec Editing
  .command(
    'edit',
    '[USER] Open a spec file in your preferred editor',
    (yargs: Argv) => {
      return yargs
        .option('target', {
          describe: 'Spec to edit (name or path)',
          type: 'string',
          demandOption: true,
          alias: 't'
        })
        .option('cursor', {
          describe: 'Output in machine-readable format for Cursor integration',
          type: 'boolean',
          default: false
        });
    },
    async (argv: any) => {
      const editModule = await import('./commands/edit.js');
      await editModule.editCommand({
        target: argv.target,
        cursor: argv.cursor || false
      });
    }
  )
  
  // Default command when none is provided
  .command('$0', 'Show help', {}, () => {
    yargsInstance.showHelp();
  })
  
  .demandCommand()
  .strict()
  .help()
  .parse(); 