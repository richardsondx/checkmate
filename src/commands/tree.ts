/**
 * Tree commands for CheckMate CLI
 */
import * as tree from '../lib/tree.js';

/**
 * List all code files in the project
 */
export async function listFiles(extensions: string[] = ['ts', 'js', 'tsx', 'jsx']): Promise<void> {
  try {
    console.log(`Scanning for files with extensions: ${extensions.join(', ')}...`);
    const files = await tree.scan(extensions);
    
    console.log(`\nFound ${files.length} files:`);
    files.forEach(file => console.log(`- ${file}`));
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

/**
 * List directories containing code files
 */
export async function listDirectories(): Promise<void> {
  try {
    console.log('Scanning for code directories...');
    const files = await tree.scan();
    const directories = tree.getDirectories(files);
    
    console.log(`\nFound ${directories.length} directories with code files:`);
    directories.forEach(dir => console.log(`- ${dir}`));
  } catch (error) {
    console.error('Error listing directories:', error);
  }
}

/**
 * Get a clean list of files for use in other commands
 */
export async function getCodeFiles(): Promise<string[]> {
  try {
    return await tree.scan();
  } catch (error) {
    console.error('Error getting code files:', error);
    return [];
  }
} 