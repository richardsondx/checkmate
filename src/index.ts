#!/usr/bin/env ts-node

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
import * as specs from './lib/specs.js';
import { Argv } from 'yargs';

// Print the welcome banner
printBanner();

// Initialize yargs parser
const yargsInstance = yargs(hideBin(process.argv));

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
    'model set <slot> <name>',
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
  
  // Spec commands
  .command(
    'gen <description>',
    'Generate a new spec from a description', 
    (yargs: Argv) => {
      return yargs
        .positional('description', {
          describe: 'Description of the feature to generate a spec for',
          type: 'string',
          demandOption: true
        });
    },
    async (argv: any) => {
      await genCommands.generateSpec(argv.description);
    }
  )
  .command('specs', 'List all spec files', {}, () => {
    genCommands.listSpecs();
  })
  
  // Run commands
  .command(
    'run',
    'Run all checks for all specs', 
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
        });
    },
    async (argv: any) => {
      const reset = !argv.noreset;
      const targets = argv.target ? argv.target.split(',') : [];
      
      const success = await runCommands.runTarget(targets, reset);
      process.exit(success ? 0 : 1); // Exit with error code if any spec failed
    }
  )
  .command(
    'next [spec]',
    'Run the next unchecked requirement in a spec', 
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
        
        const success = await runCommands.runNext(specPath);
        process.exit(success ? 0 : 1);
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
            const success = await runCommands.runNext(specFile);
            process.exit(success ? 0 : 1);
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
  
  // Default command when none is provided
  .command('$0', 'Show help', {}, () => {
    yargsInstance.showHelp();
  })
  
  .demandCommand()
  .strict()
  .help()
  .parse(); 