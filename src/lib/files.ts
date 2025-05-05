/**
 * File operations for CheckMate CLI
 * Handles file reading, writing, and content management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { scan, getFilesByGlob } from './tree.js';

/**
 * Interface for file with relevance score
 */
export interface RelevantFile {
  path: string;
  score: number;
}

/**
 * Get file content from a path
 */
export async function getFileContent(filePath: string): Promise<string> {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read file ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Write content to a file
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });
    
    // Write file
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Could not write to file ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Get relevant files based on a query string
 * This is a simple implementation that will be replaced with embeddings-based search in the future
 */
export async function getRelevantFiles(query: string, limit: number = 10): Promise<RelevantFile[]> {
  try {
    // Get all code files
    const codeExtensions = ['ts', 'js', 'tsx', 'jsx', 'py', 'rb', 'java', 'go', 'php', 'cs'];
    const files = await scan(codeExtensions);
    
    // Simple scoring: files whose names contain parts of the query get higher scores
    const scoredFiles: RelevantFile[] = [];
    
    // Normalize query for better matching
    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    
    // Score each file
    for (const file of files) {
      // Skip node_modules and other common excluded directories
      if (file.includes('node_modules') || file.includes('.git')) {
        continue;
      }
      
      // Get base filename without path
      const baseName = path.basename(file).toLowerCase();
      
      // Initial score based on file type priority
      let score = 0;
      
      // Increase score for each query term found in the filename
      for (const term of normalizedQuery) {
        if (term.length < 3) continue; // Skip short terms
        
        if (baseName.includes(term)) {
          score += 5; // Higher score for matches in filename
        } else if (file.toLowerCase().includes(term)) {
          score += 2; // Lower score for matches in path
        }
      }
      
      // Add to scored files if there's any match
      if (score > 0) {
        scoredFiles.push({ path: file, score });
      }
    }
    
    // Sort by score (descending) and take top N
    return scoredFiles
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    throw new Error(`Error finding relevant files: ${(error as Error).message}`);
  }
}

/**
 * Resolve files from glob patterns
 */
export async function resolveFilePatterns(patterns: string[]): Promise<string[]> {
  try {
    const resolvedFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await getFilesByGlob(pattern);
      resolvedFiles.push(...files);
    }
    
    // Remove duplicates
    return [...new Set(resolvedFiles)];
  } catch (error) {
    throw new Error(`Error resolving file patterns: ${(error as Error).message}`);
  }
}

/**
 * Check if a file exists and is readable
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file stats (size, modified time, etc.)
 */
export function getFileStats(filePath: string): fs.Stats {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    throw new Error(`Could not get stats for file ${filePath}: ${(error as Error).message}`);
  }
} 