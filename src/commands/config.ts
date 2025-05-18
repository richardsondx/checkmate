/**
 * Config-related commands for CheckMate CLI
 */
import { printBox } from '../ui/banner.js';
import { load, save, ensureConfigExists, updateModel, setLogMode as configSetLogMode } from '../lib/config.js';
import * as cursor from '../lib/cursor.js';
import * as cursorRules from '../lib/cursorRules.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

/**
 * Check if any Cursor rule files exist
 */
export function hasCursorRuleFiles(): boolean {
  const CURSOR_RULES_DIR = '.cursor/rules';
  if (!fs.existsSync(CURSOR_RULES_DIR)) {
    return false;
  }
  
  const ruleFiles = ['pre-task.mdc', 'post-task.mdc', 'post-push.mdc'];
  return ruleFiles.some(file => fs.existsSync(path.join(CURSOR_RULES_DIR, file)));
}

/**
 * Initialize configuration
 */
export function init(): void {
  console.log('\nStarting CheckMate initialization process...');
  
  // Print summary of what will be created/updated
  console.log('\n📋 Initialization will:');
  console.log('  ✓ Create a .checkmate config file if it doesn\'t exist');
  console.log('  ✓ Create a .checkmate.example file with example configuration');
  console.log('  ✓ Create directory structure: checkmate/specs, checkmate/logs, checkmate/cache');
  console.log('  ✓ Add CheckMate entries to .gitignore');
  console.log('  ✓ Update Cursor configuration in .cursor/config.yaml');
  console.log('  ✓ Copy up-to-date Cursor rule files from the checkmateai package');
  console.log('  ✓ These rules will include:');
  console.log('    - pre-task.mdc - Runs before each task');
  console.log('    - post-task.mdc - Runs after each task');
  console.log('    - post-push.mdc - Runs after each push');
  console.log('    - spec-assistant.mdc - Helps with spec creation and format guidance');
  console.log('    - spec-linter.mdc - Automated linting and fixing of spec files');
  console.log('    - verification-trigger.mdc - Triggers feature verification workflow');
  console.log('    - autofix-enforcer.mdc - Enforces auto-fix attempts on failures');
  console.log('    - drift-detector.mdc - Detects spec-vs-code drift');
  console.log('    - non-interactive-mode.mdc - For CI/CD or headless CheckMate runs');
  console.log('    - ai-feature-validation-guidelines.mdc - Instructional guide for AI validation');
  console.log('    - ai-verify-llm-reasoning-workflow-docs.mdc - Documentation for LLM reasoning workflow');
  console.log('\n⏳ Starting initialization...\n');
  
  // Define all expected rule files for checking and creation
  const expectedRuleFiles = [
    'pre-task.mdc',
    'post-task.mdc',
    'post-push.mdc',
    'spec-assistant.mdc',
    'spec-linter.mdc',
    'verification-trigger.mdc',
    'autofix-enforcer.mdc',
    'drift-detector.mdc',
    'non-interactive-mode.mdc',
    'ai-feature-validation-guidelines.mdc',
    'ai-verify-llm-reasoning-workflow-docs.mdc'
  ];
  
  // Define common path and variables
  const rulesDir = '.cursor/rules';
  let missingRules: string[] = [];
  let statusMessage = '✅ All rule files generated successfully.';
  
  // Ensure CheckMate config exists
  ensureConfigExists();
  
  // Create checkmate folders
  const checkmateDirs = [
    'checkmate',
    'checkmate/specs',
    'checkmate/logs',
    'checkmate/cache'
  ];
  
  // Actually create the directories
  for (const dir of checkmateDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  }
  
  // Update .gitignore if needed
  updateGitignore();
  
  // Process Cursor config rules
  let cursorConfigMessage = '';
  
  if (cursor.hasCheckMateRules()) {
    cursorConfigMessage = 'Cursor config rules already exist and were updated.';
    
    // Update the rules
    cursor.injectCheckMateRules();
  } else {
    const result = cursor.injectCheckMateRules();
    if (result.created) {
      cursorConfigMessage = 'Created new Cursor config rules in .cursor/config.yaml.';
    } else {
      cursorConfigMessage = 'Added CheckMate rules to existing Cursor config.';
    }
  }
  
  // Generate Cursor .mdc rule files - now uses direct copying from package
  console.log(chalk.blue('Setting up Cursor rule files...'));
  console.log(chalk.blue('This will copy rule templates directly from the checkmateai package to ensure consistency'));
  
  // Force regeneration of rule files to ensure they match the package templates
  cursorRules.generateAllRules(true);
  
  // Check which rules were actually created
  let cursorRulesMessage = '';
  let existingRules: string[] = [];
  
  try {
    if (fs.existsSync(rulesDir)) {
      existingRules = fs.readdirSync(rulesDir)
        .filter(file => file.endsWith('.mdc'));
    }
  } catch (err) {
    console.error(chalk.red(`Error reading rules directory: ${err}`));
  }
  
  // If we didn't get all the expected rules, and we're in the checkmateai project,
  // try a backup approach - just copy the rules from our own project to the user's project
  if (fs.existsSync('.checkmate') && path.resolve(process.cwd()).endsWith('checkmateai')) {
    console.log(chalk.blue('Running from checkmateai package - using direct rule file copy backup method'));
    
    // This is the checkmateai project itself - we can copy our own rules
    const sourceRulesDir = '.cursor/rules';
    
    if (fs.existsSync(sourceRulesDir)) {
      // Create rules directory if needed
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }
      
      try {
        // Copy all .mdc files
        const rules = fs.readdirSync(sourceRulesDir)
          .filter(file => file.endsWith('.mdc'));
        
        console.log(chalk.blue(`Found ${rules.length} rule files to copy`));
        
        for (const rule of rules) {
          const sourcePath = path.join(sourceRulesDir, rule);
          const targetPath = path.join(rulesDir, rule);
          
          try {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(chalk.green(`Copied rule file: ${rule}`));
          } catch (copyErr) {
            console.error(chalk.red(`Error copying ${rule}: ${copyErr}`));
          }
        }
        
        // Refresh the list of existing rules
        existingRules = fs.readdirSync(rulesDir)
          .filter(file => file.endsWith('.mdc'));
      } catch (err) {
        console.error(chalk.red(`Error in direct rule copy: ${err}`));
      }
    }
  }
  
  missingRules = expectedRuleFiles.filter(file => !existingRules.includes(file));
  
  // If we still have missing rules, create the critical ones directly
  // FEATURE VERIFICATION TRIGGER IS NOW verification-trigger.mdc AND IS PART OF THE STANDARD COPY 
  // The direct creation block for 'checkmate-feature-verification-trigger.mdc' might need adjustment or removal
  // if 'verification-trigger.mdc' is now reliably copied from the package.
  // For now, I will comment out the specific creation block for the old name, as the new name should be copied.
  /*
  if (missingRules.includes('checkmate-feature-verification-trigger.mdc')) { // OLD NAME
    console.log(chalk.blue('Creating critical checkmate-feature-verification-trigger.mdc file directly'));
    
    // Create rules directory if needed
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    
    // The correct content for the rule with proper parameters
    const triggerRuleContent = `--- 
    // ... content for checkmate-feature-verification-trigger.mdc ...
    // This content is now in verification-trigger.mdc and should be copied from package.
    // Ensure alwaysApply: true if this block were to be used for the new name.
    `;
    
    try {
      const rulePath = path.join(rulesDir, 'checkmate-feature-verification-trigger.mdc'); // OLD NAME
      // fs.writeFileSync(rulePath, triggerRuleContent, 'utf8');
      // console.log(chalk.green('Successfully created checkmate-feature-verification-trigger.mdc file directly'));
      
      // existingRules.push('checkmate-feature-verification-trigger.mdc');
      // missingRules = expectedRuleFiles.filter(file => !existingRules.includes(file));
    } catch (err) {
      console.error(chalk.red(`Error creating direct rule file: ${err}`));
    }
  }
  */
  
  if (missingRules.length === 0) {
    cursorRulesMessage = 'All required Cursor rule files (.mdc) were successfully created in .cursor/rules/';
  } else {
    cursorRulesMessage = `Most Cursor rule files were created, but ${missingRules.length} file(s) are missing: ${missingRules.join(', ')}`;
    statusMessage = '⚠️ Some rule files could not be created. See message for details.';
  }
  
  // Print summary of actions
  console.log('\n✨ CheckMate Initialization Complete\n');
  console.log('📋 Summary:');
  console.log(`  ${cursor.hasCheckMateRules() ? '✓' : '✗'} ${cursorConfigMessage}`);
  console.log(`  ${missingRules.length === 0 ? '✓' : '⚠️'} ${cursorRulesMessage}`);
  console.log(`\n${statusMessage}`);
  
  // Print next steps
  console.log('\n📝 Next Steps:');
  console.log('  1. Create your first spec with: checkmate gen "Feature Name"');
  console.log('  2. Or generate specs from existing codebase: checkmate warmup');
  console.log('  3. Run CheckMate on all specs: checkmate run');
  console.log('\n🔗 Learn more: https://docs.checkmate.dev');
}

/**
 * Ensure that checkmate directories are added to .gitignore
 */
function updateGitignore(): void {
  const gitignorePath = '.gitignore';
  const entriesToAdd = [
    'checkmate/',
    '.checkmate',
    '.checkmate-telemetry/'
  ];
  
  let content = '';
  let existingEntries: string[] = [];
  
  // Read existing .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
    existingEntries = content.split('\n').map(line => line.trim());
  }
  
  // Check for entries to add
  let modified = false;
  for (const entry of entriesToAdd) {
    if (!existingEntries.includes(entry)) {
      content += (content && !content.endsWith('\n')) ? '\n' : '';
      content += `${entry}\n`;
      modified = true;
      console.log(`Added ${entry} to .gitignore`);
    }
  }
  
  // Only write if we modified the file
  if (modified) {
    fs.writeFileSync(gitignorePath, content, 'utf8');
  }
}

/**
 * Show current configuration
 */
export function show(): void {
  const configuration = load();
  
  // Check for API keys
  const openaiKeyStatus = configuration.openai_key ? 
    chalk.green('✅ Set') : 
    chalk.yellow('⚠️ Not set');
  
  const anthropicKeyStatus = configuration.anthropic_key ? 
    chalk.green('✅ Set') : 
    chalk.yellow('⚠️ Not set');
  
  // Format model names
  const reasonModel = configuration.models.reason;
  const quickModel = configuration.models.quick;
  
  console.log('\nCheckMate Configuration:');
  console.log('------------------------');
  console.log(`OpenAI API Key: ${openaiKeyStatus}`);
  console.log(`Anthropic API Key: ${anthropicKeyStatus}`);
  console.log(`Models:`);
  console.log(`  reason: ${reasonModel}`);
  console.log(`  quick: ${quickModel}`);
  console.log(`Log mode: ${configuration.log}`);
  console.log(`Context top N: ${configuration.context_top_n}`);
  console.log(`Show thinking: ${configuration.show_thinking ? 'true' : 'false'}`);
  
  // Provide instructions
  console.log('\nTo update configuration:');
  console.log(`  OpenAI API key: Edit .checkmate file directly`);
  console.log(`  Anthropic API key: Edit .checkmate file directly or run 'checkmate config set-anthropic-key <key>'`);
  console.log(`  Model: checkmate model set <slot> <name>`);
  console.log(`  Log mode: checkmate log <mode>`);
}

/**
 * Set model for a specific slot
 */
export function setModel(slot: 'reason' | 'quick', modelName: string): void {
  try {
    updateModel(slot, modelName);
    console.log(`Model ${chalk.cyan(slot)} set to ${chalk.green(modelName)}`);
  } catch (error) {
    console.error(`Error setting model: ${error}`);
  }
}

/**
 * Set log mode
 */
export function setLogMode(mode: 'on' | 'off' | 'optional'): void {
  try {
    configSetLogMode(mode);
    console.log(`Log mode set to ${chalk.green(mode)}`);
  } catch (error) {
    console.error(`Error setting log mode: ${error}`);
  }
}

/**
 * Set Anthropic API key
 */
export function setAnthropicKey(key: string): void {
  try {
    const configuration = load();
    configuration.anthropic_key = key;
    save(configuration);
    console.log(`Anthropic API key ${chalk.green('set successfully')}`);
  } catch (error) {
    console.error(`Error setting Anthropic API key: ${error}`);
  }
}