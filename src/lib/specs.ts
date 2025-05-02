/**
 * Spec utilities for CheckMate CLI
 * Handles spec generation, parsing, and management
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';

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
 * For now, this creates a simple template with bullet points
 * Later, it will call the AI model to generate content
 */
export function generateSpec(
  featureDesc: string, 
  files: string[]
): { path: string; content: string } {
  // Create slug for the filename
  const slug = createSlug(featureDesc);
  const filePath = path.join(SPECS_DIR, `${slug}.md`);
  
  // Prepare example bullet points
  // In a real implementation, these would come from an AI model
  const bulletPoints = [
    "Validate input data before processing",
    "Return appropriate error codes for invalid requests",
    "Update database with new information",
    "Send notification on successful completion"
  ];
  
  // Build the markdown content
  const content = `# Feature: ${featureDesc}

## Files
${files.map(file => `- ${file}`).join('\n')}

## Requirements
${bulletPoints.map(point => `- [ ] ${point}`).join('\n')}

## Notes
- Created: ${new Date().toISOString().split('T')[0]}
- Status: Draft
`;

  // Ensure the specs directory exists
  ensureSpecsDir();
  
  // Write the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  return { path: filePath, content };
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