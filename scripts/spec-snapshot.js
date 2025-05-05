#!/usr/bin/env node

/**
 * Script to create and verify checksums of spec files to protect against unauthorized changes
 * Usage:
 *   - node scripts/spec-snapshot.js create - Creates a snapshot of current specs
 *   - node scripts/spec-snapshot.js verify - Verifies specs match the snapshot
 *   - node scripts/spec-snapshot.js diff   - Shows which files changed from snapshot
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { glob } from 'glob';

const SNAPSHOT_PATH = 'checkmate/specs/spec-snapshot.json';
const SPECS_GLOB = 'checkmate/specs/**/*.md';

// Create SHA-256 hash of file contents
function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get all spec files
async function getSpecFiles() {
  return await glob(SPECS_GLOB);
}

// Create a snapshot of all spec files
async function createSnapshot() {
  const specFiles = await getSpecFiles();
  const snapshot = {
    specs: {},
    lastUpdated: new Date().toISOString(),
    totalFiles: specFiles.length
  };

  for (const file of specFiles) {
    snapshot.specs[file] = hashFile(file);
  }

  // Create directory if it doesn't exist
  const dir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write snapshot to file
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`✅ Created snapshot of ${specFiles.length} spec files to ${SNAPSHOT_PATH}`);
}

// Compare current specs with snapshot
async function verifySnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌ Snapshot file not found at ${SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const specFiles = await getSpecFiles();
  
  let changedFiles = [];
  let newFiles = [];
  let deletedFiles = [];
  
  // Check for changed and new files
  for (const file of specFiles) {
    const currentHash = hashFile(file);
    
    if (file in snapshot.specs) {
      if (snapshot.specs[file] !== currentHash) {
        changedFiles.push(file);
      }
    } else {
      newFiles.push(file);
    }
  }
  
  // Check for deleted files
  for (const file in snapshot.specs) {
    if (!specFiles.includes(file)) {
      deletedFiles.push(file);
    }
  }
  
  const hasChanges = changedFiles.length > 0 || newFiles.length > 0 || deletedFiles.length > 0;
  
  if (!hasChanges) {
    console.log('✅ All spec files match the snapshot');
    return true;
  }
  
  console.error('❌ Spec files have changed since snapshot:');
  
  if (changedFiles.length > 0) {
    console.error(`\nChanged files (${changedFiles.length}):`);
    changedFiles.forEach(file => console.error(`  - ${file}`));
  }
  
  if (newFiles.length > 0) {
    console.error(`\nNew files (${newFiles.length}):`);
    newFiles.forEach(file => console.error(`  - ${file}`));
  }
  
  if (deletedFiles.length > 0) {
    console.error(`\nDeleted files (${deletedFiles.length}):`);
    deletedFiles.forEach(file => console.error(`  - ${file}`));
  }
  
  return false;
}

// Show detailed diff of changed files
async function diffSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌ Snapshot file not found at ${SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const specFiles = await getSpecFiles();
  
  let changedFiles = [];
  
  // Identify changed files
  for (const file of specFiles) {
    if (file in snapshot.specs) {
      const currentHash = hashFile(file);
      if (snapshot.specs[file] !== currentHash) {
        changedFiles.push(file);
      }
    }
  }
  
  if (changedFiles.length === 0) {
    console.log('✅ No spec files have changed content');
    return;
  }
  
  console.log(`Found ${changedFiles.length} changed files:\n`);
  
  // This would be a good place to integrate with a diff tool
  // For now, just list the files that changed
  changedFiles.forEach(file => {
    console.log(`- ${file}`);
  });
}

// Main function
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      await createSnapshot();
      break;
    case 'verify':
      const verified = await verifySnapshot();
      if (!verified) process.exit(1);
      break;
    case 'diff':
      await diffSnapshot();
      break;
    default:
      console.error(`
Usage:
  node scripts/spec-snapshot.js create - Creates a snapshot of current specs
  node scripts/spec-snapshot.js verify - Verifies specs match the snapshot
  node scripts/spec-snapshot.js diff   - Shows which files changed from snapshot
      `);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 