/**
 * Create command for CheckMate CLI
 * Handles creating specs from JSON payloads or PRD files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { genCommand } from './gen.js';
import { printBox, printBanner } from '../ui/banner.js';
import { parse as parseYaml } from 'yaml';

/**
 * Interface for JSON payload from external tools like Cursor
 */
export interface CreatePayload {
  feature: string;
  files?: string[];
  notes?: string;
  requirements?: string[];
  type?: string;
}

/**
 * Handle the create command
 */
export async function handleCreate(args: {
  json?: string;
  prd?: string;
  update?: string;
  agent?: boolean;
}): Promise<void> {
  try {
    // Handle JSON payload option
    if (args.json) {
      await createFromJSON(args.json, args.agent);
      return;
    }
    
    // Handle PRD file option
    if (args.prd) {
      await createFromPRD(args.prd, args.agent);
      return;
    }
    
    // Handle update option
    if (args.update) {
      await updateSpec(args.update, args.agent);
      return;
    }
    
    // If no options provided, show help
    console.error('Error: Missing required option. Use --json, --prd, or --update');
    printBox('Examples:\n' +
            '  checkmate create --json \'{"feature": "Search users", "files": ["src/user/search.ts"]}\'\n' +
            '  checkmate create --prd ./docs/PRD.md\n' +
            '  checkmate create --update lead-finder-issues\n' +
            '  checkmate create --agent --json \'{"feature": "Import GitHub issues", "files": ["app/api/github/route.ts"], "tests": "..."}\'\n');
  } catch (error) {
    console.error('Error in create command:', error);
  }
}

/**
 * Create a spec from a JSON payload
 */
async function createFromJSON(jsonStr: string, isAgent: boolean = false): Promise<void> {
  try {
    // Parse the JSON payload
    const payload: CreatePayload = JSON.parse(jsonStr);
    
    // Validate the payload
    if (!payload.feature) {
      throw new Error('JSON payload must include a "feature" field');
    }
    
    // Generate the spec
    await genCommand({
      name: payload.feature,
      description: payload.notes || (payload.requirements ? payload.requirements.join('\n- ') : undefined),
      type: payload.type
    });
    
  } catch (error) {
    console.error('Error creating spec from JSON:', error);
    throw error;
  }
}

/**
 * Create specs from a PRD markdown file
 */
async function createFromPRD(prdPath: string, isAgent: boolean = false): Promise<void> {
  try {
    if (!fs.existsSync(prdPath)) {
      console.error(`PRD file not found: ${prdPath}`);
      return;
    }
    
    const content = fs.readFileSync(prdPath, 'utf8');
    console.log(`Reading PRD from ${prdPath} (${content.length} bytes)`);
    
    // Extract feature descriptions from the PRD
    const featureMatches = content.match(/## (.*?)(?=\n## |$)/gs);
    
    if (!featureMatches || featureMatches.length === 0) {
      console.error('No features found in the PRD. Looking for "## Feature name" sections.');
      return;
    }
    
    printBanner();
    console.log(`Found ${featureMatches.length} features in the PRD`);
    
    // For each feature section, generate a spec
    for (const section of featureMatches) {
      const titleMatch = section.match(/## (.*?)(?=\n|$)/);
      if (titleMatch && titleMatch[1]) {
        // Use the section title and content as feature input
        const featureTitle = titleMatch[1].trim();
        console.log(`\nGenerating spec for feature: ${featureTitle}`);
        
        await genCommand({
          name: featureTitle,
          description: section
        });
      }
    }
  } catch (error) {
    console.error('Error generating specs from PRD:', error);
    throw error;
  }
}

/**
 * Update an existing spec
 */
async function updateSpec(slug: string, isAgent: boolean = false): Promise<void> {
  try {
    // Find the spec file
    const specsDir = 'checkmate/specs';
    const agentsDir = `${specsDir}/agents`;
    
    // Determine where to look for the spec
    const baseDir = isAgent ? agentsDir : specsDir;
    
    // Check if file exists with .md or .yaml extension
    let specPath = '';
    for (const ext of ['.md', '.yaml', '.yml']) {
      const testPath = path.join(baseDir, `${slug}${ext}`);
      if (fs.existsSync(testPath)) {
        specPath = testPath;
        break;
      }
    }
    
    // If not found directly, try to find a partial match
    if (!specPath) {
      const dirToSearch = isAgent ? agentsDir : specsDir;
      const validExts = isAgent ? ['.yaml', '.yml'] : ['.md'];
      
      try {
        const files = fs.readdirSync(dirToSearch)
          .filter(file => validExts.some(ext => file.endsWith(ext)));
        
        const match = files.find(file => file.includes(slug));
        if (match) {
          specPath = path.join(dirToSearch, match);
        }
      } catch (err) {
        // Directory may not exist yet
        if (!fs.existsSync(dirToSearch)) {
          fs.mkdirSync(dirToSearch, { recursive: true });
        }
      }
    }
    
    if (!specPath) {
      throw new Error(`Spec "${slug}" not found in ${baseDir}`);
    }
    
    // Read the existing spec
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Extract feature title based on file type
    let featureTitle = '';
    
    if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      // For YAML, parse it and get the title
      const yamlData = parseYaml(content);
      featureTitle = yamlData.title || 'Untitled Feature';
    } else {
      // For Markdown, extract from heading
      const titleMatch = content.match(/# Feature: (.*?)(?=\n|$)/) || content.match(/# (.*?)(?=\n|$)/);
      if (!titleMatch) {
        throw new Error(`Could not find feature title in spec: ${specPath}`);
      }
      featureTitle = titleMatch[1].trim();
    }
    
    console.log(`Updating spec for: "${featureTitle}"`);
    
    // Generate new spec with the same title
    await genCommand({
      name: featureTitle
    });
    
    console.log(`Spec updated: ${specPath}`);
  } catch (error) {
    console.error(`Error updating spec "${slug}":`, error);
    throw error;
  }
} 