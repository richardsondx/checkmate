/**
 * Cache cleaning command for CheckMate CLI
 * Removes orphaned cache entries when specs are deleted
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { load as loadConfig } from '../lib/config.js';
import { getAllHashesFromSpecs } from '../lib/cache-utils.js';
import os from 'node:os';

// Define interfaces for database results
interface CountResult {
  count: number;
}

interface TableResult {
  name: string;
}

/**
 * Clean the cache by removing entries that don't match existing specs
 */
export async function cleanCache(): Promise<void> {
  const spinner = ora('Scanning for valid specs...').start();
  
  // Get all valid hashes from existing specs
  const validHashes = getAllHashesFromSpecs();
  
  spinner.text = `Found ${validHashes.length} valid spec hashes`;
  
  // Open the cache database
  const cacheDir = path.join(os.homedir(), '.checkmate');
  const cacheDbPath = path.join(cacheDir, 'cache.db');
  
  if (!fs.existsSync(cacheDbPath)) {
    spinner.succeed('No cache database found. Nothing to clean.');
    return;
  }
  
  try {
    const db = new Database(cacheDbPath);
    
    // Check if the results table exists
    const tableExists = db.prepare<[], TableResult>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='results'"
    ).get();
    
    if (!tableExists) {
      spinner.succeed('Cache database exists but has no results table. Nothing to clean.');
      db.close();
      return;
    }
    
    // Get count of cache entries before cleaning
    const beforeCount = db.prepare<[], CountResult>('SELECT COUNT(*) as count FROM results').get()?.count || 0;
    
    // If there are no valid hashes, delete all cache entries
    if (validHashes.length === 0) {
      db.prepare('DELETE FROM results').run();
      spinner.succeed(`Cleaned ${beforeCount} cache entries. No valid specs found.`);
      db.close();
      return;
    }
    
    // Delete cache entries that don't match valid hashes
    let deletedCount;
    if (validHashes.length > 0) {
      // Create placeholders for the SQL query
      const placeholders = validHashes.map(() => '?').join(', ');
      const stmt = db.prepare(`DELETE FROM results WHERE key NOT IN (${placeholders})`);
      const result = stmt.run(validHashes);
      deletedCount = result.changes;
    } else {
      deletedCount = 0;
    }
    
    // Get count after cleaning
    const afterCount = db.prepare<[], CountResult>('SELECT COUNT(*) as count FROM results').get()?.count || 0;
    
    db.close();
    
    spinner.succeed(`🧹 ${chalk.green('Cache cleaned:')} Removed ${chalk.yellow(deletedCount)} outdated entries. Kept ${chalk.green(afterCount)} valid entries.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Error cleaning cache: ${errorMessage}`);
    console.error(error);
  }
}

/**
 * Force clean all cache entries
 */
export async function forceCleanCache(): Promise<void> {
  const spinner = ora('Force cleaning entire cache...').start();
  
  // Open the cache database
  const cacheDir = path.join(os.homedir(), '.checkmate');
  const cacheDbPath = path.join(cacheDir, 'cache.db');
  
  if (!fs.existsSync(cacheDbPath)) {
    spinner.succeed('No cache database found. Nothing to clean.');
    return;
  }
  
  try {
    const db = new Database(cacheDbPath);
    
    // Check if the results table exists
    const tableExists = db.prepare<[], TableResult>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='results'"
    ).get();
    
    if (!tableExists) {
      spinner.succeed('Cache database exists but has no results table. Nothing to clean.');
      db.close();
      return;
    }
    
    // Get count of cache entries before cleaning
    const beforeCount = db.prepare<[], CountResult>('SELECT COUNT(*) as count FROM results').get()?.count || 0;
    
    // Delete all cache entries
    db.prepare('DELETE FROM results').run();
    
    db.close();
    
    spinner.succeed(`🧹 ${chalk.green('Cache force cleaned:')} Removed all ${chalk.yellow(beforeCount)} entries.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Error cleaning cache: ${errorMessage}`);
    console.error(error);
  }
} 