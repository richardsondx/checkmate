/**
 * Unit tests for the stats command
 */
import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '../../.test-tmp');
const TELEMETRY_DIR = path.join(TEST_DIR, '.checkmate-telemetry');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(TELEMETRY_DIR, { recursive: true });
  
  // Create mock telemetry file
  const sessionId = 'test-session-123';
  const telemetryFile = path.join(TELEMETRY_DIR, `${sessionId}.jsonl`);
  
  // Create sample telemetry data
  const telemetryData = [
    JSON.stringify({
      ts: new Date().toISOString(),
      cmd: 'gen',
      provider: 'anthropic',
      model: 'claude-3-7-sonnet-20250219',
      in: 500,
      out: 300,
      ms: 1200
    }),
    JSON.stringify({
      ts: new Date().toISOString(),
      cmd: 'warmup',
      provider: 'openai',
      model: 'gpt-4o-mini',
      in: 800,
      out: 600,
      ms: 2000
    })
  ].join('\n');
  
  await fs.writeFile(telemetryFile, telemetryData);
  
  // Mock environment
  process.env.CHECKMATE_TELEMETRY_SESSION_ID = sessionId;
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  return () => {
    // Clean up
    process.cwd = originalCwd;
    delete process.env.CHECKMATE_TELEMETRY_SESSION_ID;
  };
}

/**
 * Test the stats command
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Import the telemetry module to test the stats command
    const telemetry = await import('../../../dist/lib/telemetry.js');
    
    // Test the session summary function
    const summary = telemetry.summary();
    
    // Assertions for summary
    assert(summary && typeof summary === 'object', 'Summary should be an object');
    assert(typeof summary.tokens === 'number', 'Tokens should be a number');
    assert(typeof summary.cost === 'number', 'Cost should be a number');
    assert(typeof summary.byModel === 'object', 'byModel should be an object');
    
    // Test the current session accessor
    const currentSession = telemetry.getCurrentSession();
    assert(currentSession && typeof currentSession === 'object', 'CurrentSession should be an object');
    assert(currentSession.id === 'test-session-123', 'Session ID should match');
    
    // Test getAllSessionsSummary
    const allSessions = telemetry.getAllSessionsSummary({});
    assert(allSessions && typeof allSessions === 'object', 'All sessions summary should be an object');
    assert(typeof allSessions.tokens === 'number', 'Tokens should be a number');
    
    // Test with specific session ID
    const specificSession = telemetry.getAllSessionsSummary({ sessionId: 'test-session-123' });
    assert(specificSession && typeof specificSession === 'object', 'Specific session summary should be an object');
    
    console.log('✅ PASS: All stats command tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 