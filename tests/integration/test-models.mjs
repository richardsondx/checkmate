// Test script for model integration
import { testModelIntegration } from '../../dist/lib/models.js';

async function run() {
  console.log('Testing model integration...');
  
  try {
    const success = await testModelIntegration();
    
    if (success) {
      console.log('✅ Model integration test passed!');
    } else {
      console.log('❌ Model integration test failed.');
    }
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

run(); 