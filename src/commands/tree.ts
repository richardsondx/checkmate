/**
 * Tree commands for CheckMate CLI
 */
import * as tree from '../lib/tree.js';
import { ErrorCode, createErrorResponse, notifySuccess } from '../lib/tree.js';

/**
 * List all code files in the project
 */
export async function listFiles(extensions: string[] = ['ts', 'js', 'tsx', 'jsx']): Promise<void> {
  try {
    console.log(`Scanning for files with extensions: ${extensions.join(', ')}...`);
    
    // Validate input data
    if (!Array.isArray(extensions) || extensions.length === 0) {
      const error = createErrorResponse(
        ErrorCode.INVALID_EXTENSION,
        'Invalid extensions array provided',
        { extensions }
      );
      console.error('Error:', error);
      return;
    }
    
    const files = await tree.scan(extensions);
    
    console.log(`\nFound ${files.length} files:`);
    files.forEach(file => console.log(`- ${file}`));
    
    // Send notification on successful completion
    notifySuccess('listFiles', { count: files.length });
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Error listing files',
      { error }
    );
    console.error('Error:', errorResponse);
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
    
    // Send notification on successful completion
    notifySuccess('listDirectories', { count: directories.length });
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Error listing directories',
      { error }
    );
    console.error('Error:', errorResponse);
  }
}

/**
 * Get a clean list of files for use in other commands
 */
export async function getCodeFiles(): Promise<string[]> {
  try {
    const files = await tree.scan();
    // Send notification on successful completion
    notifySuccess('getCodeFiles', { count: files.length });
    return files;
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCode.UNKNOWN_ERROR,
      'Error getting code files',
      { error }
    );
    console.error('Error:', errorResponse);
    return [];
  }
} 