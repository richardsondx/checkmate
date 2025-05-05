import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'crypto';
import { load as loadConfig } from './config.js';

/**
 * Get all valid spec files from the specs directory
 */
export function getAllSpecFiles(): string[] {
  const config = loadConfig();
  const specsDir = path.join(process.cwd(), 'checkmate/specs');
  
  if (!fs.existsSync(specsDir)) {
    return [];
  }
  
  return fs.readdirSync(specsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(specsDir, file));
}

/**
 * Compute hash for a spec file based on its files and requirement
 */
export function computeSpecHash(specFile: string): string | null {
  try {
    const content = fs.readFileSync(specFile, 'utf8');
    
    // Extract files list and requirement from frontmatter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      return null;
    }
    
    const frontMatter = frontMatterMatch[1];
    
    // Extract files list (basic parsing, consider using a YAML parser in production)
    const filesMatch = frontMatter.match(/files:\s*\n((?:\s*-\s*.*\n)*)/);
    const requireMatch = frontMatter.match(/require:\s*(.*?)(?:\n|$)/);
    
    if (!filesMatch || !requireMatch) {
      return null;
    }
    
    const files = filesMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/\s*-\s*/, '').trim());
    
    const requirement = requireMatch[1].trim();
    
    // Compute files hash
    const fileHashes = files.map(file => {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        return '';
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    }).join('');
    
    // Final hash combining file hashes and requirement
    return crypto.createHash('sha256')
      .update(fileHashes + requirement)
      .digest('hex');
  } catch (error) {
    console.error(`Error computing hash for ${specFile}:`, error);
    return null;
  }
}

/**
 * Get all valid hashes from existing specs
 */
export function getAllHashesFromSpecs(): string[] {
  const specFiles = getAllSpecFiles();
  
  return specFiles
    .map(specFile => computeSpecHash(specFile))
    .filter((hash): hash is string => hash !== null);
}