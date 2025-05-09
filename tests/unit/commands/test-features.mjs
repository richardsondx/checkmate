import test from 'ava';
import sinon from 'sinon';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get directory name of current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');

test.beforeEach(t => {
  // Create the test sandbox
  t.context.sandbox = sinon.createSandbox();
  
  // Mock fs.existsSync
  t.context.existsSync = t.context.sandbox.stub(fs, 'existsSync');
  t.context.existsSync.callsFake(path => {
    if (path.endsWith('last-warmup.json')) {
      return true; // Mock the last-warmup.json file exists
    }
    return false;
  });
  
  // Mock fs.readFileSync
  t.context.readFileSync = t.context.sandbox.stub(fs, 'readFileSync');
  t.context.readFileSync.callsFake(path => {
    if (path.endsWith('last-warmup.json')) {
      // Return mock last-warmup.json content
      return JSON.stringify({
        timestamp: '2023-06-01T12:00:00.000Z',
        features: [
          { slug: 'user-authentication-flow', title: 'User Authentication Flow' },
          { slug: 'task-list-management', title: 'Task List Management' },
          { slug: 'notification-system', title: 'Notification System' }
        ]
      });
    }
    return '';
  });

  // Stub indexSpecs to return empty results (so we only test PRD features)
  t.context.indexSpecs = t.context.sandbox.stub().returns([]);
  
  // Mock console.log to avoid test output noise
  t.context.consoleLog = t.context.sandbox.stub(console, 'log');
});

test.afterEach(t => {
  t.context.sandbox.restore();
});

test('Features command should read from last-warmup.json', async t => {
  // Import the module to test
  const featuresModule = await import('../../../src/commands/features.js');
  
  // Override indexSpecs with our stub
  featuresModule.indexSpecs = t.context.indexSpecs;
  
  // Run the features command with JSON output option
  const result = await featuresModule.featuresCommand({
    json: true
  });
  
  // Parse the JSON result
  const features = JSON.parse(result);
  
  // Verify behavior
  t.truthy(result, 'Should return a result');
  t.true(Array.isArray(features), 'Result should be a JSON array');
  t.is(features.length, 3, 'Should include all features from last-warmup.json');
  
  // Check that we have the expected features
  const slugs = features.map(f => f.slug);
  t.true(slugs.includes('user-authentication-flow'), 'Should include user-authentication-flow');
  t.true(slugs.includes('task-list-management'), 'Should include task-list-management');
  t.true(slugs.includes('notification-system'), 'Should include notification-system');
  
  // Check that features are properly identified as coming from PRD
  const prdFeatures = features.filter(f => f.identified_by === 'prd_warmup');
  t.is(prdFeatures.length, 3, 'All features should be marked as prd_warmup');
});

test('Features command should handle non-existent last-warmup.json', async t => {
  // Import the module to test
  const featuresModule = await import('../../../src/commands/features.js');
  
  // Override existsSync to return false for last-warmup.json
  t.context.existsSync.callsFake(path => {
    return false;
  });
  
  // Stub indexSpecs to return some example specs
  featuresModule.indexSpecs = t.context.sandbox.stub().returns([
    { slug: 'example-feature', title: 'Example Feature', type: 'USER', status: 'UNKNOWN', fileCount: 0 }
  ]);
  
  // Run the features command with JSON output option
  const result = await featuresModule.featuresCommand({
    json: true
  });
  
  // Parse the JSON result
  const features = JSON.parse(result);
  
  // Verify behavior
  t.truthy(result, 'Should return a result even without last-warmup.json');
  t.true(Array.isArray(features), 'Result should be a JSON array');
  t.is(features.length, 1, 'Should include only specs from indexSpecs');
  
  // Check that the example feature is found
  t.is(features[0].slug, 'example-feature', 'Should include example-feature');
  t.is(features[0].identified_by, 'spec_file', 'Should be marked as spec_file');
});

test('Features command should merge specs with PRD features', async t => {
  // Import the module to test
  const featuresModule = await import('../../../src/commands/features.js');
  
  // Override indexSpecs with test data
  featuresModule.indexSpecs = t.context.sandbox.stub().returns([
    { 
      slug: 'user-authentication-flow', 
      title: 'User Auth', 
      type: 'USER', 
      status: 'PASS', 
      fileCount: 5,
      filePath: 'checkmate/specs/user-authentication-flow.md'
    },
    { 
      slug: 'different-feature', 
      title: 'Different Feature', 
      type: 'USER', 
      status: 'UNKNOWN', 
      fileCount: 0,
      filePath: 'checkmate/specs/different-feature.md'
    }
  ]);
  
  // Run the features command with JSON output option
  const result = await featuresModule.featuresCommand({
    json: true
  });
  
  // Parse the JSON result
  const features = JSON.parse(result);
  
  // Verify behavior
  t.truthy(result, 'Should return a result');
  t.true(Array.isArray(features), 'Result should be a JSON array');
  t.is(features.length, 4, 'Should combine specs and PRD features');
  
  // Find our merged feature
  const mergedFeature = features.find(f => f.slug === 'user-authentication-flow');
  t.truthy(mergedFeature, 'Merged feature should exist');
  t.is(mergedFeature.identified_by, 'both', 'Should be marked as both');
  t.is(mergedFeature.status, 'PASS', 'Should keep the status from spec');
  
  // Check for PRD-only features
  const prdOnlyFeature = features.find(f => f.slug === 'notification-system');
  t.truthy(prdOnlyFeature, 'PRD-only feature should exist');
  t.is(prdOnlyFeature.identified_by, 'prd_warmup', 'Should be marked as prd_warmup');
}); 