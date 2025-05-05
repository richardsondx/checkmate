/**
 * Spec utilities for CheckMate CLI
 * Handles spec generation, parsing, and management
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';
import { callModel } from './models.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import crypto from 'crypto';
import glob from 'fast-glob';

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';

// Create a simple validator function for YAML specs
const validateYamlSpecStructure = (data: any): { valid: boolean; errors?: string[] } => {
  const errors: string[] = [];
  
  // Check for required fields
  if (!data.title) errors.push('Missing title field');
  if (!data.files || !Array.isArray(data.files)) errors.push('Missing or invalid files array');
  if (!data.checks && !data.requirements) errors.push('Missing or invalid checks array');
  
  // Check checks structure if present
  if (data.checks && Array.isArray(data.checks)) {
    data.checks.forEach((check: any, index: number) => {
      if (!check.id) errors.push(`Check at index ${index} is missing id`);
      if (!check.require && !check.text) errors.push(`Check at index ${index} is missing require or text field`);
    });
  }
  // Backward compatibility for requirements
  else if (data.requirements && Array.isArray(data.requirements)) {
    data.requirements.forEach((req: any, index: number) => {
      if (!req.id) errors.push(`Requirement at index ${index} is missing id`);
      if (!req.require && !req.text) errors.push(`Requirement at index ${index} is missing require or text field`);
    });
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Create a slug from a feature description
 */
export function createSlug(featureDesc: string): string {
  return featureDesc
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Create a new spec file from a feature description
 * Uses AI to generate checks and context
 */
export async function generateSpec(
  featureDesc: string, 
  files: string[]
): Promise<{ path: string; content: string }> {
  console.log('Generating AI-driven checks...');
  
  // Create slug for the filename
  const slug = createSlug(featureDesc);
  const filePath = path.join(SPECS_DIR, `${slug}.md`);
  
  // Prepare the prompt for the AI model
  const filesList = files.map(file => `- ${file}`).join('\n');
  const prompt = `Create a detailed specification for the following feature:
  
Feature: ${featureDesc}

The codebase has the following files:
${filesList}

Generate a markdown document with EXACTLY this format:
1. A title based on the feature description
2. A section called "## Checks" containing 3-7 specific, testable checks as a checklist with "[ ]" format

IMPORTANT: The ONLY allowed format is:
# Title
## Checks
- [ ] Check 1
- [ ] Check 2
- [ ] Check 3

DO NOT include any other sections, headings, or notes.
DO NOT include a "## Files" or "## Relevant Files" section as we will add this metadata separately.

Return ONLY the markdown content, no explanations or additional text.`;

  // Define the system prompt for the model
  const systemPrompt = `You are a senior toolsmith specialized in creating software specifications.
Your task is to create a detailed spec in markdown format, with clear checks that can be checked programmatically.
Be specific, actionable, and focus on measurable outcomes.

The specification MUST be a Markdown document with EXACTLY this format:
1. A title at the top using a single # heading
2. A section called "## Checks" containing 3-7 specific, testable checks as a checklist with "[ ]" format
3. NO OTHER sections or headings are allowed

DO NOT include any other headings like "## Implementation Notes", "## Feature Requirements", "## Architecture Considerations", etc.
DO NOT include a "## Files" or "## Relevant Files" section.

Use clear language and avoid jargon.
Format your response as a valid Markdown document.`;

  try {
    // Call the AI model to generate the spec content
    const content = await callModel('reason', systemPrompt, prompt);
    
    // Ensure the specs directory exists
    ensureSpecsDir();
    
    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Import the auto-files module to add metadata
    const autoFilesModule = await import('./auto-files.js');
    
    // Add meta information with automatic file discovery
    await autoFilesModule.addMetaToSpec(filePath, true);
    
    // Read the updated content with meta
    const updatedContent = fs.readFileSync(filePath, 'utf8');
    
    return { path: filePath, content: updatedContent };
  } catch (error) {
    console.error('Error generating spec with AI:', error);
    
    // Fallback to a basic template if AI fails
    const fallbackContent = `# ${featureDesc}

## Checks
- [ ] Validate input data before processing
- [ ] Return appropriate error codes for invalid requests
- [ ] Update database with new information
- [ ] Send notification on successful completion
`;
    
    // Ensure the specs directory exists
    ensureSpecsDir();
    
    // Write the fallback file
    fs.writeFileSync(filePath, fallbackContent, 'utf8');
    
    // Import the auto-files module to add metadata
    const autoFilesModule = await import('./auto-files.js');
    
    // Add meta information with automatic file discovery
    await autoFilesModule.addMetaToSpec(filePath, true);
    
    // Read the updated content with meta
    const updatedContent = fs.readFileSync(filePath, 'utf8');
    
    return { path: filePath, content: updatedContent };
  }
}

/**
 * Define Check interface
 */
export interface Requirement {
  id: string;
  require: string;
  text?: string;
  test?: string;
  status: boolean;
}

// Alias Check to Requirement for backward compatibility
export type Check = Requirement;

/**
 * Parse a spec file (both YAML and Markdown)
 */
export function parseSpec(specPath: string): { 
  title: string; 
  files: string[]; 
  requirements: Requirement[];
  checks?: Requirement[];
  machine?: boolean;
} {
  const content = fs.readFileSync(specPath, 'utf8');
  const extension = path.extname(specPath).toLowerCase();
  
  // Check if this spec is in the agents subfolder
  const isAgentSpec = specPath.includes(`${SPECS_DIR}/agents/`);
  
  // Handle YAML files (.yaml, .yml)
  if (extension === '.yaml' || extension === '.yml') {
    const result = parseYamlSpec(content);
    if (isAgentSpec) {
      result.machine = true;
    }
    return result;
  }
  
  // Handle Markdown files (.md)
  const result = parseMarkdownSpec(content);
  if (isAgentSpec) {
    result.machine = true;
  }
  return result;
}

/**
 * Validate YAML document against JSON schema
 */
export function validateYamlDocument(yamlContent: any): { valid: boolean; errors?: string[] } {
  try {
    const valid = validateYamlSpecStructure(yamlContent);
    
    if (!valid.valid) {
      return {
        valid: false,
        errors: valid.errors
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Serialize JavaScript object to YAML string
 */
export function serializeToYaml(data: any): string {
  try {
    return stringifyYaml(data);
  } catch (error: any) {
    console.error('Error serializing to YAML:', error);
    throw new Error(`Failed to serialize to YAML: ${error.message}`);
  }
}

/**
 * Update the parseYamlSpec function to use schema validation
 */
function parseYamlSpec(content: string): { 
  title: string;
  files: string[];
  requirements: Requirement[];
  checks?: Requirement[];
  machine?: boolean;
} {
  try {
    // Parse YAML content
    const yamlData = parseYaml(content);
    
    // Validate against schema
    const validationResult = validateYamlDocument(yamlData);
    if (!validationResult.valid) {
      const errorMsg = validationResult.errors ? validationResult.errors.join(', ') : 'Unknown validation error';
      console.warn(`YAML validation warnings: ${errorMsg}`);
    }
    
    // Use checks if available, fall back to requirements for backward compatibility
    const checksArray = yamlData.checks || yamlData.requirements || [];
    
    // Convert checks to standard format with require/status
    const checks = checksArray.map((check: any) => {
      return {
        id: check.id || crypto.randomBytes(4).toString('hex'),
        require: check.require || check.text || 'Unknown check',
        text: check.text,
        test: check.test,
        status: check.status === true
      };
    });
    
    return {
      title: yamlData.title || 'Untitled Spec',
      files: yamlData.files || [],
      requirements: checks, // For backward compatibility
      checks,
      machine: false
    };
  } catch (error) {
    console.error('Error parsing YAML spec:', error);
    return {
      title: 'Error parsing spec',
      files: [],
      requirements: [],
      checks: [],
      machine: false
    };
  }
}

/**
 * Parse Markdown file
 */
function parseMarkdownSpec(content: string): { 
  title: string;
  files: string[];
  requirements: Requirement[];
  checks?: Requirement[];
  machine?: boolean;
} {
  // Extract title from the first heading
  const titleMatch = content.match(/# (?:Feature: )?(.*?)(?=\n|$)/);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Spec';
  
  // Extract files section
  const filesSection = content.match(/(?:##|###) Files\s+([\s\S]*?)(?=##|$)/);
  const files: string[] = [];
  
  if (filesSection && filesSection[1]) {
    const fileLines = filesSection[1].split('\n');
    
    for (const line of fileLines) {
      if (line.trim().startsWith('-')) {
        const filePath = line.trim().substring(1).trim();
        if (filePath) {
          files.push(filePath);
        }
      }
    }
  }
  
  // Try to extract "Checks" section first, fallback to "Requirements" for backward compatibility
  const checksSection = content.match(/(?:##|###) Checks\s+([\s\S]*?)(?=##|$)/);
  const reqSection = !checksSection ? content.match(/(?:##|###) Requirements\s+([\s\S]*?)(?=##|$)/) : null;
  const checks: Requirement[] = [];
  
  const section = checksSection || reqSection;
  if (section && section[1]) {
    const lines = section[1].split('\n');
    
    for (const line of lines) {
      // Look for checkbox format: - [ ] or - [x]
      const checkMatch = line.match(/- \[([ xX])\] (.*?)(?=\n|$)/);
      
      if (checkMatch) {
        const status = checkMatch[1].toLowerCase() === 'x';
        const text = checkMatch[2].trim();
        
        // Create a check with an ID
        checks.push({
          id: crypto.randomBytes(4).toString('hex'),
          require: text,
          text,
          status
        });
      }
    }
  }
  
  return {
    title,
    files,
    requirements: checks, // For backward compatibility
    checks,
    machine: false
  };
}

/**
 * List all spec files
 */
export function listSpecs(): string[] {
  ensureSpecsDir();
  
  try {
    // Use glob pattern to find specs in both root and agents subfolder
    return glob.sync(`${SPECS_DIR}/**/*.{md,markdown,yaml,yml}`, { absolute: true });
  } catch (error) {
    console.error('Error listing specs:', error);
    return [];
  }
}

/**
 * Get a spec by name (slug)
 */
export function getSpecByName(name: string): string | null {
  ensureSpecsDir();
  
  // Check if name already includes a supported extension
  const hasExtension = ['.md', '.yaml', '.yml'].some(ext => name.endsWith(ext));
  
  if (hasExtension) {
    const specPath = path.join(SPECS_DIR, name);
    if (fs.existsSync(specPath)) {
      return specPath;
    }
  } else {
    // Try with each extension
    for (const ext of ['.md', '.yaml', '.yml']) {
      const specPath = path.join(SPECS_DIR, `${name}${ext}`);
      if (fs.existsSync(specPath)) {
        return specPath;
      }
    }
  }
  
  // Try to find a partial match
  const files = fs.readdirSync(SPECS_DIR).filter(file => 
    file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
  );
  
  const match = files.find(file => {
    const baseName = path.basename(file, path.extname(file));
    return baseName.toLowerCase().includes(name.toLowerCase());
  });
  
  if (match) {
    return path.join(SPECS_DIR, match);
  }
  
  return null;
}

/**
 * Find all specs affected by a list of changed files
 */
export function findAffectedSpecs(changedFiles: string[]): string[] {
  const specFiles = listSpecs();
  const affectedSpecs: string[] = [];
  
  // Convert all changed file paths to absolute paths for consistency
  const normalizedChangedFiles = changedFiles.map(file => path.resolve(file));
  
  for (const specFile of specFiles) {
    const { files } = parseSpec(specFile);
    
    // Check if any of the spec's files match the changed files
    const isAffected = files.some(specFile => {
      const normalizedSpecFile = path.resolve(specFile);
      return normalizedChangedFiles.some(changedFile => 
        changedFile.includes(normalizedSpecFile) || normalizedSpecFile.includes(changedFile)
      );
    });
    
    if (isAffected) {
      affectedSpecs.push(specFile);
    }
  }
  
  return affectedSpecs;
}

/**
 * Verify that files referenced in the spec exist
 */
export function verifyReferencedFiles(files: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const file of files) {
    if (!fs.existsSync(file)) {
      missing.push(file);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// Ensure the specs directory exists
function ensureSpecsDir(): void {
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
} 