/**
 * Affected specs command for CheckMate CLI
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tree from '../lib/tree.js';
import { printBox } from '../ui/banner.js';

/**
 * Find specs affected by changes
 */
export async function findAffectedSpecs(args: { json?: boolean, base?: string }): Promise<void> {
  try {
    console.log('Finding affected specs...');
    
    // Get changed files
    const changedFiles = await tree.getChangedFiles(args.base);
    
    console.log(`Found ${changedFiles.length} changed files`);
    
    if (changedFiles.length === 0) {
      console.log('No changed files found.');
      return;
    }
    
    // Find all spec files
    const specsDir = 'checkmate/specs';
    if (!fs.existsSync(specsDir)) {
      console.log('No specs directory found. Generate specs with "checkmate gen".');
      return;
    }
    
    const allSpecFiles = fs.readdirSync(specsDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(specsDir, file));
    
    if (allSpecFiles.length === 0) {
      console.log('No spec files found. Generate specs with "checkmate gen".');
      return;
    }
    
    // Find affected specs by parsing each spec and checking for file matches
    const affectedSpecs: {
      path: string;
      slug: string;
      title: string;
    }[] = [];
    
    for (const specPath of allSpecFiles) {
      const { affected, slug, title } = isSpecAffected(specPath, changedFiles);
      
      if (affected) {
        affectedSpecs.push({ path: specPath, slug, title });
      }
    }
    
    // Output results
    if (args.json) {
      // JSON output (just slugs)
      const slugs = affectedSpecs.map(spec => spec.slug);
      console.log(JSON.stringify(slugs));
    } else {
      // Human-readable output
      if (affectedSpecs.length === 0) {
        console.log('No specs affected by these changes.');
      } else {
        console.log(`\nFound ${affectedSpecs.length} affected specs:`);
        
        affectedSpecs.forEach(spec => {
          console.log(`- ${spec.title} (${spec.slug})`);
        });
        
        printBox(`Run 'checkmate run <slug>' to verify any of these specs against your changes`);
      }
    }
    
  } catch (error) {
    console.error('Error finding affected specs:', error);
  }
}

/**
 * Check if a spec is affected by changed files
 */
function isSpecAffected(specPath: string, changedFiles: string[]): { 
  affected: boolean; 
  slug: string;
  title: string;
} {
  try {
    // Read spec file
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Extract slug from filename
    const slug = path.basename(specPath, '.md');
    
    // Extract title
    const titleMatch = content.match(/# Feature: (.*?)(?=\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    
    // Extract file paths from the spec
    const fileSection = content.match(/files:\s*\n((?:- .*?\n)*)/);
    
    if (!fileSection) {
      return { affected: false, slug, title };
    }
    
    const specFiles = fileSection[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- '))
      .map(line => line.substring(2).trim());
    
    // Check if any of the changed files match files mentioned in the spec
    const isAffected = specFiles.some(specFile => {
      return changedFiles.some(changedFile => {
        // Normalize paths for comparison
        const normalizedSpecFile = path.normalize(specFile);
        const normalizedChangedFile = path.normalize(changedFile);
        
        // Check for exact match or if changed file is within a directory mentioned in spec
        return normalizedChangedFile === normalizedSpecFile || 
               normalizedChangedFile.startsWith(normalizedSpecFile + path.sep) ||
               normalizedSpecFile.includes(normalizedChangedFile);
      });
    });
    
    return { affected: isAffected, slug, title };
  } catch (error) {
    console.error(`Error checking spec ${specPath}:`, error);
    return { affected: false, slug: path.basename(specPath, '.md'), title: path.basename(specPath, '.md') };
  }
} 