/**
 * Create command for CheckMate CLI
 * Handles creating specs from JSON payloads or PRD files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateSpec, generateFromPRD } from './gen.js';
import { printBox } from '../ui/banner.js';

/**
 * Interface for JSON payload from external tools like Cursor
 */
export interface CreatePayload {
  feature: string;
  files?: string[];
  notes?: string;
  requirements?: string[];
}

/**
 * Handle the create command
 */
export async function handleCreate(args: {
  json?: string;
  prd?: string;
  update?: string;
}): Promise<void> {
  try {
    // Handle JSON payload option
    if (args.json) {
      await createFromJSON(args.json);
      return;
    }
    
    // Handle PRD file option
    if (args.prd) {
      await generateFromPRD(args.prd);
      return;
    }
    
    // Handle update option
    if (args.update) {
      await updateSpec(args.update);
      return;
    }
    
    // If no options provided, show help
    console.error('Error: Missing required option. Use --json, --prd, or --update');
    printBox('Examples:\n' +
            '  checkmate create --json \'{"feature": "Search users", "files": ["src/user/search.ts"]}\'\n' +
            '  checkmate create --prd ./docs/PRD.md\n' +
            '  checkmate create --update lead-finder-issues');
  } catch (error) {
    console.error('Error in create command:', error);
  }
}

/**
 * Create a spec from a JSON payload
 */
async function createFromJSON(jsonStr: string): Promise<void> {
  try {
    // Parse the JSON payload
    const payload: CreatePayload = JSON.parse(jsonStr);
    
    // Validate the payload
    if (!payload.feature) {
      throw new Error('JSON payload must include a "feature" field');
    }
    
    // Generate the spec
    await generateSpec(payload.feature, {
      files: payload.files,
      notes: payload.notes || (payload.requirements ? payload.requirements.join('\n- ') : undefined)
    });
    
  } catch (error) {
    console.error('Error creating spec from JSON:', error);
    throw error;
  }
}

/**
 * Update an existing spec
 */
async function updateSpec(slug: string): Promise<void> {
  try {
    // Find the spec file
    const specsDir = 'checkmate/specs';
    let specPath = path.join(specsDir, `${slug}.md`);
    
    // Check if the file exists directly or needs a .md extension
    if (!fs.existsSync(specPath)) {
      // If it doesn't exist, try to find a partial match
      const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.md'));
      const match = files.find(file => file.includes(slug));
      
      if (match) {
        specPath = path.join(specsDir, match);
      } else {
        throw new Error(`Spec "${slug}" not found`);
      }
    }
    
    // Read the existing spec
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Extract the feature title and description
    const titleMatch = content.match(/# Feature: (.*?)(?=\n|$)/);
    if (!titleMatch) {
      throw new Error(`Could not find feature title in spec: ${specPath}`);
    }
    
    const featureTitle = titleMatch[1].trim();
    console.log(`Updating spec for: "${featureTitle}"`);
    
    // Generate new spec with the same title
    await generateSpec(featureTitle);
    
    console.log(`Spec updated: ${specPath}`);
  } catch (error) {
    console.error(`Error updating spec "${slug}":`, error);
    throw error;
  }
} 