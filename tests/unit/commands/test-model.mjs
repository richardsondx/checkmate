#!/usr/bin/env node
/**
 * Unit test for the model command
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testDir = join(projectRoot, 'temp-test', 'model-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config with initial model
  const configPath = join(testDir, '.checkmate');
  const config = {
    model: "openai/gpt-4"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the model module
    const modelModule = await import('../../../dist/commands/model.js');
    
    // Test 1: listModels
    const { listModels } = modelModule;
    const models = listModels();
    
    assert.strictEqual(Array.isArray(models), true, "listModels should return an array");
    assert.strictEqual(models.length > 0, true, "Should have at least one model");
    
    // Check if each model has name and provider
    const hasValidModel = models.some(model => model.name && model.provider);
    assert.strictEqual(hasValidModel, true, "At least one model should have name and provider");
    
    // Test 2: getCurrentModel
    const { getCurrentModel } = modelModule;
    const currentModel = getCurrentModel();
    
    assert.strictEqual(currentModel, "openai/gpt-4", "Current model should match config");
    
    // Test 3: setModel (if function exists in the module)
    if (modelModule.setModel) {
      // Test setting to a new model
      const { setModel } = modelModule;
      await setModel("anthropic/claude-3-haiku-20240307");
      
      // Check if model was updated in config
      const configContent = fs.readFileSync(join(testDir, '.checkmate'), 'utf8');
      const updatedConfig = JSON.parse(configContent);
      
      assert.strictEqual(updatedConfig.model, "anthropic/claude-3-haiku-20240307", "Model should be updated in config");
      
      // Verify with getCurrentModel
      const updatedModel = getCurrentModel();
      assert.strictEqual(updatedModel, "anthropic/claude-3-haiku-20240307", "getCurrentModel should return updated model");
    } else {
      console.log('Note: setModel function not available for testing');
    }
    
    console.log('\n✅ PASS: All model command tests passed');
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}); 