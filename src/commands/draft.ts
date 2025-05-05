/**
 * CheckMate Draft Command
 * Generates specification drafts without writing to disk
 */
import path from 'node:path';
import chalk from 'chalk';
import { printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { splitFeature } from '../lib/splitter.js';
import { buildContext } from '../lib/context.js';
import { execSync } from 'node:child_process';

interface DraftOptions {
  description: string;
  context?: number;
  return?: string;
  yaml?: boolean;
}

/**
 * Draft specification interface
 */
export interface SpecDraft {
  slug: string;
  title: string;
  description?: string;
  files: string[];
  checks: string[];
  approved?: boolean;
  meta?: {
    files_auto?: boolean;
    domain?: string;
    file_hashes?: Record<string, string>;
  };
}

/**
 * Draft command handler
 */
export async function draftCommand(options: DraftOptions): Promise<SpecDraft[]> {
  // Print welcome banner
  printBanner();
  
  console.log(chalk.cyan(`\n🔍 Analyzing "${options.description}" for potential specs...`));
  
  // Split the description into feature stubs
  const features = await splitFeature(options.description);
  
  // Get project files
  const projectFiles = getProjectFiles();
  
  // Process context limit
  const contextLimit = options.context || 50;
  
  // For each feature, get relevant files
  const specDrafts = await Promise.all(
    features.map(async (feature) => {
      // Get relevant files for this feature
      const context = await buildContext(feature, false);
      
      // Sort files by relevance and take the top N
      const relevantFiles = context
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, contextLimit)
        .map(c => c.path);
      
      // Create a spec draft
      const draft: SpecDraft = {
        slug: feature.slug,
        title: feature.title,
        description: feature.description,
        files: relevantFiles,
        checks: [
          // Add some default checks based on the feature description
          `Implement ${feature.title}`,
          `Add tests for ${feature.title}`
        ],
        approved: false
      };
      
      return draft;
    })
  );
  
  console.log(chalk.green(`\n✅ Generated ${specDrafts.length} draft specifications`));
  
  // Return as JSON for processing by caller
  return specDrafts;
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

/**
 * Format draft specs as JSON string
 */
export function formatDraftsAsJson(drafts: SpecDraft[]): string {
  return JSON.stringify(drafts, null, 2);
} 