/**
 * Affected specs commands for CheckMate CLI
 * Identifies specs affected by code changes
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as specs from '../lib/specs.js';
import { load as loadConfig } from '../lib/config.js';

const execAsync = promisify(exec);

/**
 * Get changed files based on git diff
 */
async function getChangedFiles(diffBase: string = 'origin/main'): Promise<string[]> {
  try {
    // Run git diff to get changed files
    const { stdout } = await execAsync(`git diff --name-only ${diffBase}`);
    
    // Return array of changed file paths
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting changed files:', error);
    return [];
  }
}

/**
 * Find specs affected by current changes
 */
export async function findAffectedSpecs(diffBase: string = 'origin/main', outputFormat: 'list' | 'csv' = 'list'): Promise<string[]> {
  try {
    // Get changed files
    const changedFiles = await getChangedFiles(diffBase);
    
    // If no files changed, return empty result
    if (changedFiles.length === 0) {
      console.log('No files changed.');
      return [];
    }
    
    // Find affected specs
    const affectedSpecs = specs.findAffectedSpecs(changedFiles);
    
    // Return affected specs
    return affectedSpecs;
  } catch (error) {
    console.error('Error finding affected specs:', error);
    return [];
  }
}

/**
 * Find and print specs affected by current changes
 */
export async function printAffectedSpecs(diffBase: string = 'origin/main', outputFormat: 'list' | 'csv' = 'list'): Promise<void> {
  try {
    // Find affected specs
    const affectedSpecs = await findAffectedSpecs(diffBase, outputFormat);
    
    // If no specs affected, print message
    if (affectedSpecs.length === 0) {
      console.log('No specs affected by changes.');
      return;
    }
    
    // Format spec names (show basename only)
    const specNames = affectedSpecs.map(specPath => path.basename(specPath, '.md'));
    
    // Print results in requested format
    if (outputFormat === 'csv') {
      console.log(specNames.join(','));
    } else {
      console.log(`\nFound ${affectedSpecs.length} affected specs:`);
      specNames.forEach(spec => console.log(`- ${spec}`));
    }
    
    // Set environment variable if CM_LIST is set
    if (process.env.CM_LIST) {
      process.env[process.env.CM_LIST] = specNames.join(',');
    }
  } catch (error) {
    console.error('Error printing affected specs:', error);
  }
} 