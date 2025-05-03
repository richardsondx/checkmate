#!/usr/bin/env node
/**
 * Unit test for the feature splitter
 * Tests whether a complex sentence with multiple features gets split correctly
 */
import { splitFeature } from './dist/lib/splitter.js';

// Test input: a complex sentence with multiple features
const testInput = "Find by Issues and by Repositories";

// Run the test
console.log(`\nTesting feature splitter with input: "${testInput}"\n`);

async function runTest() {
  try {
    console.log('Calling splitFeature...');
    const result = await splitFeature(testInput);
    
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify the result
    if (!Array.isArray(result)) {
      console.error('❌ FAIL: Result is not an array');
      process.exit(1);
    }
    
    if (result.length !== 2) {
      console.error(`❌ FAIL: Expected 2 features, but got ${result.length}`);
      process.exit(1);
    }
    
    // Check if each feature has the required properties
    const validFeatures = result.every(feature => 
      typeof feature.title === 'string' && 
      typeof feature.slug === 'string' && 
      typeof feature.description === 'string'
    );
    
    if (!validFeatures) {
      console.error('❌ FAIL: Not all features have required properties (title, slug, description)');
      process.exit(1);
    }
    
    // Check if the features are distinct
    const distinct = result[0].title !== result[1].title;
    if (!distinct) {
      console.error('❌ FAIL: Features are not distinct');
      process.exit(1);
    }
    
    // Check if the titles contain "issue" and "repository" keywords
    const hasIssue = result.some(feature => 
      feature.title.toLowerCase().includes('issue') || feature.description.toLowerCase().includes('issue')
    );
    
    const hasRepo = result.some(feature => 
      feature.title.toLowerCase().includes('repo') || feature.description.toLowerCase().includes('repo')
    );
    
    if (!hasIssue || !hasRepo) {
      console.error(`❌ FAIL: Features don't correctly separate issues and repositories`);
      process.exit(1);
    }
    
    console.log('\n✅ PASS: Features were correctly split into issues and repositories');
    return true;
  } catch (error) {
    console.error('❌ Error running test:', error);
    process.exit(1);
  }
}

// Run the test
runTest().then(success => {
  if (success) {
    console.log('\nTest completed successfully');
  }
}); 