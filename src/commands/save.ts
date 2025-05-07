/**
 * CheckMate Save Command
 * Saves approved specification drafts to disk
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { printBanner } from '../ui/banner.js';
import { SpecDraft } from './draft.js';
import { generateSpec } from '../lib/specs.js';
import { generateTypeBSpec } from '../lib/specAuthor.js';

const SPECS_DIR = 'checkmate/specs';
const AGENT_SPECS_DIR = path.join(SPECS_DIR, 'agents');

interface SaveOptions {
  json: string;
  format?: 'md' | 'yaml' | 'both';
  force?: boolean;
}

/**
 * Save command result
 */
interface SaveResult {
  saved: number;
  skipped: number;
  paths: string[];
}

/**
 * Save command handler
 */
export async function saveCommand(options: SaveOptions): Promise<SaveResult> {
  // Print welcome banner
  printBanner();
  
  console.log(chalk.cyan(`\n💾 Saving approved specifications...`));
  
  // Parse the JSON input
  let specDrafts: SpecDraft[];
  try {
    specDrafts = JSON.parse(options.json);
    
    // Validate the JSON structure
    if (!Array.isArray(specDrafts)) {
      throw new Error('JSON must be an array of spec drafts');
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error parsing JSON: ${error}`));
    throw error;
  }
  
  // Ensure specs directory exists
  ensureSpecsDir();
  
  // Track results
  const result: SaveResult = {
    saved: 0,
    skipped: 0,
    paths: []
  };
  
  // Process each spec draft
  for (const draft of specDrafts) {
    // Skip drafts that are not approved unless force is true
    if (!draft.approved && !options.force) {
      console.log(chalk.yellow(`Skipping unapproved spec: ${draft.title}`));
      result.skipped++;
      continue;
    }
    
    try {
      // Determine the format to save
      const format = options.format || 'md';
      
      if (format === 'md' || format === 'both') {
        // Save as markdown
        const mdPath = await saveMarkdownSpec(draft);
        console.log(chalk.green(`✅ Saved Markdown spec: ${mdPath}`));
        result.paths.push(mdPath);
      }
      
      if (format === 'yaml' || format === 'both') {
        // Save as YAML
        const yamlPath = await saveYamlSpec(draft);
        console.log(chalk.green(`✅ Saved YAML spec: ${yamlPath}`));
        result.paths.push(yamlPath);
      }
      
      result.saved++;
    } catch (error) {
      console.error(chalk.red(`\n❌ Error saving spec "${draft.title}": ${error}`));
      result.skipped++;
    }
  }
  
  console.log(chalk.green(`\n🎉 Saved ${result.saved} specifications (skipped ${result.skipped})`));
  
  return result;
}

/**
 * Save a spec draft as a markdown file
 */
async function saveMarkdownSpec(draft: SpecDraft): Promise<string> {
  // Generate the spec content with predefined requirements
  const result = await generateSpec(
    draft.title, 
    draft.files
  );
  
  // Add custom requirements using markdown format
  let content = result.content;
  
  // Find the Checks/Requirements section and replace it with our custom checks
  if (draft.checks && draft.checks.length > 0) {
    const checksSection = content.match(/(?:##|###) (?:Checks|Requirements)\s+([\s\S]*?)(?=##|$)/);
    if (checksSection) {
      const newChecks = draft.checks.map(check => `- [ ] ${check}`).join('\n');
      content = content.replace(checksSection[0], `## Checks\n${newChecks}\n\n`);
    }
  }
  
  // Ensure meta section is properly included
  const metaJson = JSON.stringify({
    files_auto: true,
    file_hashes: draft.files.reduce((acc: Record<string, string>, file: string) => {
      acc[file] = draft.meta?.file_hashes?.[file] || 'auto-generated';
      return acc;
    }, {} as Record<string, string>)
  }, null, 2);
  
  // Check if content already has a meta section
  if (!content.includes('<!-- meta:')) {
    content += `\n\n<!-- meta:\n${metaJson}\n-->\n`;
  }
  
  // Add footer to indicate it was generated via interactive mode
  const finalContent = `${content}\n\n<!-- generated via checkmate interactive v0.4 -->\n`;
  
  // Write to disk
  fs.writeFileSync(result.path, finalContent, 'utf8');
  
  return result.path;
}

/**
 * Save a spec draft as a YAML agent spec
 */
async function saveYamlSpec(draft: SpecDraft): Promise<string> {
  // Generate a type B spec
  const spec = await generateTypeBSpec(draft.title, draft.description || '');
  
  // Generate path for the spec
  const slug = draft.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const specPath = path.join(AGENT_SPECS_DIR, `${slug}.yaml`);
  
  // Create a custom YAML structure
  const yamlSpec = {
    title: draft.title,
    files: draft.files,
    // Convert 'checks' to 'requirements' format for YAML specs
    requirements: draft.checks.map((check, index) => ({
      id: `req-${index + 1}`,
      require: check,
      test: `file ${draft.files[0] || 'src/index.ts'} => EXISTS`,
      status: false
    })),
    meta: {
      files_auto: true,
      file_hashes: draft.files.reduce((acc: Record<string, string>, file: string) => {
        acc[file] = draft.meta?.file_hashes?.[file] || 'auto-generated';
        return acc;
      }, {} as Record<string, string>)
    }
  };
  
  // Convert to YAML and save
  const yaml = require('yaml');
  const yamlContent = yaml.stringify(yamlSpec);
  fs.writeFileSync(specPath, yamlContent, 'utf8');
  
  return specPath;
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