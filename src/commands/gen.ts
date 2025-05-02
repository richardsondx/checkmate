/**
 * Spec generator command for CheckMate CLI
 */
import * as specs from '../lib/specs.js';
import * as treeCommands from './tree.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { printBox } from '../ui/banner.js';

const execAsync = promisify(exec);

/**
 * Generate a specification from a feature description
 */
export async function generateSpec(featureDesc: string): Promise<void> {
  try {
    console.log(`Generating spec for: "${featureDesc}"`);
    
    // Scan for relevant files
    console.log('Scanning for relevant files...');
    const files = await treeCommands.getCodeFiles();
    
    // If no files found, warn the user
    if (files.length === 0) {
      console.warn('Warning: No code files found in the project.');
    }
    
    // Generate the spec
    const result = specs.generateSpec(featureDesc, files);
    
    console.log(`\nSpec file created at: ${result.path}`);
    
    // Check if the user wants to edit the spec file
    const shouldEdit = process.env.CHECKMATE_EDIT === '1';
    
    if (shouldEdit) {
      await openEditor(result.path);
    } else {
      // Display a preview of the spec
      console.log('\nPreview of the spec:');
      console.log('----------------------------------------');
      console.log(result.content);
      console.log('----------------------------------------');
      
      printBox(`To edit this spec, set CHECKMATE_EDIT=1 or run your editor: ${result.path}`);
    }
    
  } catch (error) {
    console.error('Error generating spec:', error);
  }
}

/**
 * Open a file in the user's default editor
 */
async function openEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || 'vi'; // Default to vi if no editor is specified
  
  try {
    console.log(`Opening ${filePath} with ${editor}...`);
    
    // For macOS, we use open -e for TextEdit or directly use the editor command
    if (process.platform === 'darwin' && editor === 'open') {
      await execAsync(`open -e "${filePath}"`);
    } else {
      await execAsync(`${editor} "${filePath}"`);
    }
    
    console.log('File edited successfully.');
  } catch (error) {
    console.error(`Error opening editor: ${error}`);
    console.log(`You can manually edit the file at: ${filePath}`);
  }
}

/**
 * List all spec files
 */
export function listSpecs(): void {
  const specFiles = specs.listSpecs();
  
  if (specFiles.length === 0) {
    console.log('No spec files found. Generate one with "checkmate gen".');
    return;
  }
  
  console.log(`Found ${specFiles.length} spec files:`);
  specFiles.forEach(file => console.log(`- ${file}`));
} 