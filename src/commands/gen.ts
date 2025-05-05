/**
 * CheckMate Gen Command
 * Generates specifications for testing
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { generateSpec } from '../lib/specs.js';
import { execSync } from 'node:child_process';
import { printBox, printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { generateTypeASpec, generateTypeBSpec, saveSpecification } from '../lib/specAuthor.js';
import { splitFeature, FeatureStub } from '../lib/splitter.js';
import { buildContext } from '../lib/context.js';

const SPECS_DIR = 'checkmate/specs';
const AGENT_SPECS_DIR = path.join(SPECS_DIR, 'agents');

interface GenOptions {
  name?: string;
  description?: string;
  output?: string;
  type?: string;
  interactive?: boolean;
  files?: string[];
  agent?: boolean;
}

export async function genCommand(options?: GenOptions): Promise<{ path: string, content: string } | { paths: string[], contents: string[] }> {
  // Print welcome banner
  printBanner();
  
  // Ensure specs directory exists
  ensureSpecsDir();
  
  // Get feature name if not provided
  const name = options?.name || await promptFeatureName();
  
  // Get feature description if not provided
  const description = options?.description || await promptFeatureDescription(name);
  
  // Use interactive mode if specified
  if (options?.interactive) {
    return handleInteractiveMode(name, description, options);
  }
  
  // Get specification type if not provided
  const type = options?.type || (options?.agent ? 'B' : await promptSpecificationType());
  
  console.log(chalk.cyan(`\n⚙️ Generating ${type} specification for: ${name}`));
  
  try {
    // Generate based on specification type
    switch (type) {
      case 'A':
        return await generateTypeASpecification(name, description, options?.output);
      case 'B':
      case 'agent':
        return await generateTypeBSpecification(name, description, options?.output);
      default:
        return await generateRegularSpecification(name, description, options?.files);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error generating specification:'), error);
    throw error;
  }
}

/**
 * Handle interactive mode for spec generation
 */
async function handleInteractiveMode(
  sentence: string, 
  description: string, 
  options?: GenOptions
): Promise<{ paths: string[], contents: string[] }> {
  console.log(chalk.cyan('\n🔍 Analyzing feature sentence for potential specs...'));
  
  // Use the new draft command internally to get all potential specs
  const { draftCommand } = await import('./draft.js');
  const { saveCommand } = await import('./save.js');
  
  // Get draft specs
  const drafts = await draftCommand({
    description: sentence,
    context: 50
  });
  
  if (drafts.length === 0) {
    console.log(chalk.yellow('\n⚠️ No potential specifications could be generated. Please try a different description.'));
    process.exit(1);
  }
  
  // Display a warning if confidence is low for any feature
  const lowConfidenceStubs = drafts.filter(d => d.title.toLowerCase().includes('untitled') || d.files.length === 0);
  if (lowConfidenceStubs.length > 0) {
    console.log(chalk.yellow('\n⚠️ Low confidence detected in some specs. Review carefully.'));
  }
  
  // Display table of specs
  displayDraftTable(drafts);
  
  // Ask user to approve/edit/delete each spec
  const approvedDrafts = await promptDraftReview(drafts);
  
  if (approvedDrafts.length === 0) {
    console.log(chalk.yellow('\n⚠️ No specs selected. Exiting...'));
    process.exit(0);
  }
  
  // Convert to JSON and save the approved drafts
  const jsonDrafts = JSON.stringify(approvedDrafts);
  
  // Determine the format to save based on options
  const format = options?.agent ? 'yaml' : 'md';
  
  console.log(chalk.cyan('\n⚙️ Generating specifications for approved specs...'));
  
  // Use the save command to write specs to disk
  const saveResult = await saveCommand({
    json: jsonDrafts,
    format
  });
  
  console.log(chalk.green(`\n🎉 Successfully generated ${saveResult.saved} specifications!`));
  console.log(chalk.dim('Specs written to:'));
  saveResult.paths.forEach(path => {
    console.log(chalk.dim(`- ${path}`));
  });
  
  // Return the paths and read the contents for API compatibility
  const contents = saveResult.paths.map(p => {
    try {
      return fs.readFileSync(p, 'utf8');
    } catch (error) {
      return '';
    }
  });
  
  return {
    paths: saveResult.paths,
    contents
  };
}

/**
 * Display table of draft specs
 */
function displayDraftTable(
  drafts: Array<{ title: string, files: string[], slug: string }>
): void {
  console.log('\n' + chalk.bold('Spec Draft Analysis:'));
  console.log('┌───────────────────────────────────────────┐');
  console.log('│ ' + chalk.bold(
    'Title'.padEnd(30) + 
    'Files'.padEnd(8) + 
    'Status'.padEnd(12)
  ) + ' │');
  console.log('├───────────────────────────────────────────┤');
  
  drafts.forEach((draft, index) => {
    const fileCount = draft.files.length;
    const statusColor = 
      fileCount > 10 ? chalk.green :
      fileCount > 5 ? chalk.yellow :
      chalk.red;
    
    console.log('│ ' + 
      `${(index + 1).toString().padEnd(2)}${draft.title.substring(0, 28).padEnd(28)} ` + 
      `${fileCount.toString().padEnd(8)} ` +
      `${statusColor('Draft'.padEnd(12))}` +
      ' │'
    );
  });
  
  console.log('└───────────────────────────────────────────┘');
}

/**
 * Prompt user to review draft specs
 */
async function promptDraftReview(
  drafts: Array<{ 
    title: string, 
    description?: string, 
    files: string[], 
    checks: string[],
    slug: string 
  }>
): Promise<Array<{ 
    title: string, 
    description?: string, 
    files: string[], 
    checks: string[],
    slug: string,
    approved: boolean 
  }>> {
  const approvedDrafts = [];
  
  // First show a multi-select to choose which drafts to keep
  const { selectedIndices } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIndices',
      message: 'Select specs to generate:',
      choices: drafts.map((draft, index) => ({
        name: `${index + 1}. ${draft.title} (${draft.files.length} files)`,
        value: index,
        checked: true
      }))
    }
  ]);
  
  // Exit if no drafts were selected
  if (selectedIndices.length === 0) {
    return [];
  }
  
  // For each selected draft, allow editing
  for (const index of selectedIndices) {
    const draft = drafts[index];
    
    console.log(chalk.cyan(`\nReview Spec ${index + 1}: ${draft.title}`));
    if (draft.description) {
      console.log(chalk.dim(`Description: ${draft.description}`));
    }
    
    if (draft.files.length > 0) {
      console.log(chalk.dim(`Relevant files (showing first 5 of ${draft.files.length}):`));
      draft.files.slice(0, 5).forEach(file => {
        console.log(chalk.dim(`- ${file}`));
      });
    }
    
    if (draft.checks.length > 0) {
      console.log(chalk.dim(`Checks (${draft.checks.length}):`));
      draft.checks.forEach((check, i) => {
        console.log(chalk.dim(`${i + 1}. ${check}`));
      });
    }
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this spec?',
        choices: [
          { name: 'Approve', value: 'approve' },
          { name: 'Edit', value: 'edit' },
          { name: 'Skip', value: 'skip' }
        ]
      }
    ]);
    
    if (action === 'skip') {
      console.log(chalk.yellow(`Skipped spec: ${draft.title}`));
      continue;
    }
    
    if (action === 'edit') {
      const { editedTitle, editedDescription } = await inquirer.prompt([
        {
          type: 'input',
          name: 'editedTitle',
          message: 'Edit spec title:',
          default: draft.title
        },
        {
          type: 'input',
          name: 'editedDescription',
          message: 'Edit spec description:',
          default: draft.description || ''
        }
      ]);
      
      // Update with edited values
      draft.title = editedTitle;
      draft.description = editedDescription;
      draft.slug = createSlug(editedTitle);
      
      // Allow check editing
      const { editChecks } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'editChecks',
          message: 'Would you like to edit the checks?',
          default: false
        }
      ]);
      
      if (editChecks) {
        let checks = [...draft.checks];
        let editing = true;
        
        while (editing) {
          // Display current checks with numbers
          console.log(chalk.cyan('\nCurrent checks:'));
          checks.forEach((check, i) => {
            console.log(`${i + 1}. ${check}`);
          });
          
          const { checkAction } = await inquirer.prompt([
            {
              type: 'list',
              name: 'checkAction',
              message: 'What would you like to do?',
              choices: [
                { name: 'Add a check', value: 'add' },
                { name: 'Edit a check', value: 'edit' },
                { name: 'Remove a check', value: 'remove' },
                { name: 'Done editing checks', value: 'done' }
              ]
            }
          ]);
          
          if (checkAction === 'done') {
            editing = false;
            continue;
          }
          
          if (checkAction === 'add') {
            const { newCheck } = await inquirer.prompt([
              {
                type: 'input',
                name: 'newCheck',
                message: 'Enter new check:',
                validate: (input) => input.trim().length > 0 || 'Check cannot be empty'
              }
            ]);
            
            checks.push(newCheck);
            console.log(chalk.green('Check added.'));
          }
          
          if (checkAction === 'edit') {
            if (checks.length === 0) {
              console.log(chalk.yellow('No checks to edit.'));
              continue;
            }
            
            const { checkIndex } = await inquirer.prompt([
              {
                type: 'list',
                name: 'checkIndex',
                message: 'Which check would you like to edit?',
                choices: checks.map((check, i) => ({
                  name: `${i + 1}. ${check}`,
                  value: i
                }))
              }
            ]);
            
            const { editedCheck } = await inquirer.prompt([
              {
                type: 'input',
                name: 'editedCheck',
                message: 'Edit check:',
                default: checks[checkIndex],
                validate: (input) => input.trim().length > 0 || 'Check cannot be empty'
              }
            ]);
            
            checks[checkIndex] = editedCheck;
            console.log(chalk.green('Check updated.'));
          }
          
          if (checkAction === 'remove') {
            if (checks.length === 0) {
              console.log(chalk.yellow('No checks to remove.'));
              continue;
            }
            
            const { checkIndex } = await inquirer.prompt([
              {
                type: 'list',
                name: 'checkIndex',
                message: 'Which check would you like to remove?',
                choices: checks.map((check, i) => ({
                  name: `${i + 1}. ${check}`,
                  value: i
                }))
              }
            ]);
            
            checks.splice(checkIndex, 1);
            console.log(chalk.green('Check removed.'));
          }
        }
        
        // Update the draft with edited checks
        draft.checks = checks;
      }
    }
    
    // Allow file selection/editing
    const { editFiles } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'editFiles',
        message: 'Would you like to review and edit the file list?',
        default: false
      }
    ]);
    
    if (editFiles) {
      const { selectedFiles } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedFiles',
        message: 'Select files to include:',
        choices: draft.files.map(file => ({
          name: file,
          value: file,
          checked: true
        })),
        pageSize: 15
      });
      
      // Update files list with selection
      draft.files = selectedFiles;
    }
    
    // Mark as approved and add to the list
    approvedDrafts.push({
      ...draft,
      approved: true
    });
    
    console.log(chalk.green(`✅ Approved spec: ${draft.title}`));
  }
  
  return approvedDrafts;
}

/**
 * Helper function to create a slug from a title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a Type A specification
 */
async function generateTypeASpecification(
  name: string, 
  description: string, 
  outputPath?: string
): Promise<{ path: string, content: string }> {
  try {
    // Generate Type A spec
    const spec = await generateTypeASpec(name, description);
    
    // Generate default output path if not provided
    let finalPath = outputPath;
    if (!finalPath) {
      // Ensure agent specs directory exists
      if (!fs.existsSync(AGENT_SPECS_DIR)) {
        fs.mkdirSync(AGENT_SPECS_DIR, { recursive: true });
      }
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      finalPath = path.join(AGENT_SPECS_DIR, `test-specification-type-a-${slug}.yaml`);
    }
    
    // Convert to JSON and save
    const specJson = JSON.stringify(spec, null, 2);
    fs.writeFileSync(finalPath, specJson, 'utf8');
    
    console.log(chalk.green(`✅ Generated Type A specification at: ${finalPath}`));
    
    return { 
      path: finalPath,
      content: specJson
    };
  } catch (error) {
    console.error(chalk.red(`❌ Error generating Type A specification: ${error}`));
    throw error;
  }
}

/**
 * Generate a Type B specification
 */
async function generateTypeBSpecification(
  name: string, 
  description: string, 
  outputPath?: string
): Promise<{ path: string, content: string }> {
  try {
    // Generate Type B spec
    const spec = await generateTypeBSpec(name, description);
    
    // Generate default output path if not provided
    let finalPath = outputPath;
    if (!finalPath) {
      // Ensure agent specs directory exists
      if (!fs.existsSync(AGENT_SPECS_DIR)) {
        fs.mkdirSync(AGENT_SPECS_DIR, { recursive: true });
      }
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      finalPath = path.join(AGENT_SPECS_DIR, `test-specification-type-b-${slug}.yaml`);
    }
    
    // Convert to JSON and save
    const specJson = JSON.stringify(spec, null, 2);
    fs.writeFileSync(finalPath, specJson, 'utf8');
    
    console.log(chalk.green(`✅ Generated Type B specification at: ${finalPath}`));
    
    return { 
      path: finalPath,
      content: specJson
    };
  } catch (error) {
    console.error(chalk.red(`❌ Error generating Type B specification: ${error}`));
    throw error;
  }
}

/**
 * Generate a regular specification
 */
async function generateRegularSpecification(
  name: string, 
  description: string,
  explicitFiles?: string[]
): Promise<{ path: string, content: string }> {
  // Get list of files in the project for context (if not explicitly provided)
  const files = explicitFiles || getProjectFiles();
  
  // Generate spec with AI
  const result = await generateSpec(name, files);
  
  console.log(chalk.green(`✅ Generated specification at: ${result.path}`));
  
  return result;
}

/**
 * Ensure specs directory exists
 */
function ensureSpecsDir(): void {
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(AGENT_SPECS_DIR)) {
    fs.mkdirSync(AGENT_SPECS_DIR, { recursive: true });
  }
}

/**
 * Prompt for feature name
 */
async function promptFeatureName(): Promise<string> {
  const { featureName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'featureName',
      message: 'Enter a name for your feature:',
      validate: (input) => input.trim().length > 0 || 'Feature name is required'
    }
  ]);
  
  return featureName;
}

/**
 * Prompt for feature description
 */
async function promptFeatureDescription(featureName: string): Promise<string> {
  const { featureDesc } = await inquirer.prompt([
    {
      type: 'input',
      name: 'featureDesc',
      message: 'Enter a brief description of the feature:',
      default: `Implementation of ${featureName}`,
      validate: (input) => input.trim().length > 0 || 'Feature description is required'
    }
  ]);
  
  return featureDesc;
}

/**
 * Prompt for specification type
 */
async function promptSpecificationType(): Promise<string> {
  const { specType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'specType',
      message: 'What type of specification do you want to generate?',
      choices: [
        {
          name: 'Regular (AI-generated markdown)',
          value: 'regular'
        },
        {
          name: 'Type A (for test case specifications)',
          value: 'A'
        },
        {
          name: 'Type B (for requirement validation)',
          value: 'B'
        }
      ]
    }
  ]);
  
  return specType;
}

/**
 * Get list of files in the project
 */
function getProjectFiles(): string[] {
  try {
    // Load config to get tree command
    const config = loadConfig();
    const treeCmd = config.tree_cmd || "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'";
    
    // Execute tree command
    const output = execSync(treeCmd, { encoding: 'utf8' });
    
    // Split output by lines and clean up
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.includes('node_modules'));
  } catch (error) {
    console.error('Error getting project files:', error);
    return [];
  }
}