/**
 * Spec utilities for CheckMate CLI
 * Handles spec generation, parsing, and management
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';
import { callModel } from './models.js';

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';

// Ensure the specs directory exists
function ensureSpecsDir(): void {
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
}

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
 * Uses AI to generate requirements and context
 */
export async function generateSpec(
  featureDesc: string, 
  files: string[]
): Promise<{ path: string; content: string }> {
  console.log('Generating AI-driven requirements...');
  
  // Create slug for the filename
  const slug = createSlug(featureDesc);
  const filePath = path.join(SPECS_DIR, `${slug}.md`);
  
  // Prepare the prompt for the AI model
  const filesList = files.map(file => `- ${file}`).join('\n');
  const prompt = `Create a detailed specification for the following feature:
  
Feature: ${featureDesc}

The codebase has the following files:
${filesList}

Generate a markdown document with:
1. A title based on the feature description
2. A list of relevant files from the ones listed above that would be involved in implementing this feature
3. 4-6 specific, testable requirements for this feature (as a checklist with "[ ]" format)
4. Brief notes with any considerations or implementation details

Return ONLY the markdown content, no explanations or additional text.`;

  // Define the system prompt for the model
  const systemPrompt = `You are a senior toolsmith specialized in creating software specifications.
Your task is to create a detailed spec in markdown format, with clear requirements that can be checked programmatically.
Be specific, actionable, and focus on measurable outcomes.
Format your response as a valid Markdown document.`;

  try {
    // Call the AI model to generate the spec content
    const content = await callModel('reason', systemPrompt, prompt);
    
    // Ensure the specs directory exists
    ensureSpecsDir();
    
    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    return { path: filePath, content };
  } catch (error) {
    console.error('Error generating spec with AI:', error);
    
    // Fallback to a basic template if AI fails
    const fallbackContent = `# Feature: ${featureDesc}

## Files
${files.map(file => `- ${file}`).join('\n')}

## Requirements
- [ ] Validate input data before processing
- [ ] Return appropriate error codes for invalid requests
- [ ] Update database with new information
- [ ] Send notification on successful completion

## Notes
- Created: ${new Date().toISOString().split('T')[0]}
- Status: Draft
`;
    
    // Ensure the specs directory exists
    ensureSpecsDir();
    
    // Write the fallback file
    fs.writeFileSync(filePath, fallbackContent, 'utf8');
    
    return { path: filePath, content: fallbackContent };
  }
}

/**
 * Parse a spec file to extract requirements
 */
export function parseSpec(filePath: string): { 
  title: string;
  files: string[];
  requirements: Array<{ text: string; status: boolean }>;
} {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let title = '';
  const files: string[] = [];
  const requirements: Array<{ text: string; status: boolean }> = [];
  
  let section = '';
  
  for (const line of lines) {
    if (line.startsWith('# Feature:')) {
      title = line.substring(10).trim();
    } else if (line.startsWith('## ')) {
      section = line.substring(3).trim();
    } else if (line.startsWith('- ') && section === 'Files') {
      files.push(line.substring(2).trim());
    } else if (line.startsWith('- [ ]') && section === 'Requirements') {
      requirements.push({ text: line.substring(5).trim(), status: false });
    } else if (line.startsWith('- [✓]') || line.startsWith('- [✔]') && section === 'Requirements') {
      requirements.push({ text: line.substring(5).trim(), status: true });
    } else if (line.startsWith('- [x]') || line.startsWith('- [X]') && section === 'Requirements') {
      requirements.push({ text: line.substring(5).trim(), status: true });
    }
  }
  
  return { title, files, requirements };
}

/**
 * List all spec files
 */
export function listSpecs(): string[] {
  ensureSpecsDir();
  
  try {
    return fs.readdirSync(SPECS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(SPECS_DIR, file));
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
  
  // If name already includes .md, use it directly
  const specName = name.endsWith('.md') ? name : `${name}.md`;
  const specPath = path.join(SPECS_DIR, specName);
  
  if (fs.existsSync(specPath)) {
    return specPath;
  }
  
  // Try to find a partial match
  const files = fs.readdirSync(SPECS_DIR).filter(file => file.endsWith('.md'));
  const match = files.find(file => file.includes(name));
  
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