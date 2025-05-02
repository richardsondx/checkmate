/**
 * Cursor rules integration for CheckMate CLI
 * Manages Cursor rule configuration for automatic test execution
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse, stringify } from 'yaml';

// Path to the Cursor config file
const CURSOR_CONFIG_DIR = '.cursor';
const CURSOR_CONFIG_FILE = path.join(CURSOR_CONFIG_DIR, 'config.yaml');

// Default rules to inject
const DEFAULT_RULES = {
  pre_task: [
    {
      name: 'cm_scope',
      cmd: 'checkmate affected',
      env: { CM_LIST: '$OUTPUT' }
    }
  ],
  post_task: [
    {
      name: 'cm_verify',
      cmd: 'checkmate run --target "$CM_LIST"'
    }
  ],
  post_push: [
    {
      name: 'cm_regress',
      cmd: 'checkmate run'
    }
  ]
};

/**
 * Check if Cursor configuration directory exists
 */
function ensureCursorConfigDir(): void {
  if (!fs.existsSync(CURSOR_CONFIG_DIR)) {
    fs.mkdirSync(CURSOR_CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load Cursor configuration (or return empty object if it doesn't exist)
 */
function loadCursorConfig(): any {
  try {
    if (fs.existsSync(CURSOR_CONFIG_FILE)) {
      const content = fs.readFileSync(CURSOR_CONFIG_FILE, 'utf8');
      return parse(content) || {};
    }
  } catch (error) {
    console.error('Error loading Cursor config:', error);
  }
  
  return {};
}

/**
 * Save Cursor configuration
 */
function saveCursorConfig(config: any): void {
  ensureCursorConfigDir();
  fs.writeFileSync(CURSOR_CONFIG_FILE, stringify(config), 'utf8');
}

/**
 * Check if CheckMate rules are already in the Cursor config
 */
export function hasCheckMateRules(): boolean {
  const config = loadCursorConfig();
  
  // Check if any rule contains checkmate in the command
  const hasPreTask = config.pre_task?.some((rule: any) => 
    rule.cmd && rule.cmd.includes('checkmate'));
  
  const hasPostTask = config.post_task?.some((rule: any) => 
    rule.cmd && rule.cmd.includes('checkmate'));
  
  const hasPostPush = config.post_push?.some((rule: any) => 
    rule.cmd && rule.cmd.includes('checkmate'));
  
  return hasPreTask || hasPostTask || hasPostPush;
}

/**
 * Add CheckMate rules to Cursor config
 */
export function injectCheckMateRules(): { created: boolean; updated: boolean } {
  // Load existing config
  const config = loadCursorConfig();
  const isNewFile = !fs.existsSync(CURSOR_CONFIG_FILE);
  
  // Initialize sections if they don't exist
  if (!config.pre_task) config.pre_task = [];
  if (!config.post_task) config.post_task = [];
  if (!config.post_push) config.post_push = [];
  
  // Remove any existing CheckMate rules
  config.pre_task = config.pre_task.filter((rule: any) => 
    !(rule.cmd && rule.cmd.includes('checkmate')));
  
  config.post_task = config.post_task.filter((rule: any) => 
    !(rule.cmd && rule.cmd.includes('checkmate')));
  
  config.post_push = config.post_push.filter((rule: any) => 
    !(rule.cmd && rule.cmd.includes('checkmate')));
  
  // Add the CheckMate rules
  config.pre_task.push(...DEFAULT_RULES.pre_task);
  config.post_task.push(...DEFAULT_RULES.post_task);
  config.post_push.push(...DEFAULT_RULES.post_push);
  
  // Save the updated config
  saveCursorConfig(config);
  
  return { 
    created: isNewFile,
    updated: !isNewFile
  };
} 