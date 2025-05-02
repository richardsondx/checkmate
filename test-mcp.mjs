// Test script for MCP router functionality
import { routeEvent } from './dist/mcp/router.js';

async function testMcpRouter() {
  console.log('🧪 Testing MCP router...');
  
  // Simulate task.started event
  console.log('\n📝 Simulating task.started event:');
  const startedEvent = {
    type: 'task.started',
    task: {
      id: 'test-task-123',
      description: 'Test MCP event handling'
    }
  };
  
  console.log('Event payload:', JSON.stringify(startedEvent, null, 2));
  console.log('Sending event to router...');
  
  try {
    const response = await routeEvent(startedEvent);
    console.log('Response:', response);
    console.log('✅ Successfully processed task.started event');
  } catch (error) {
    console.error('❌ Error processing event:', error);
  }
  
  // In a real test, we would also test task.finished
  console.log('\n✅ MCP router test complete!');
}

testMcpRouter(); 