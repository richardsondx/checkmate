/**
 * CheckMate MCP Router
 * Handles incoming Cursor events and routes them to the appropriate commands
 */

import { execSync } from 'child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { handleMcpEvent, McpEventType } from '../lib/executor.js';

/**
 * Run tests on specs
 */
async function runTests(specTarget?: string) {
  try {
    const runCommand = specTarget 
      ? `node dist/index.js run --target "${specTarget}"`
      : 'node dist/index.js run';
    
    // Run the tests first
    console.log('🧪 Running checks on specs');
    
    // Create an event to indicate test run has started
    handleMcpEvent({
      type: McpEventType.START,
      message: `Running checks on specs: ${specTarget || 'all'}`,
      timestamp: Date.now()
    });
    
    execSync(runCommand, { stdio: 'inherit' });
    
    // Create an event to indicate test run has completed
    handleMcpEvent({
      type: McpEventType.COMPLETE,
      message: `Completed checks on specs: ${specTarget || 'all'}`,
      result: true,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Error running specs:', error);
    
    // Create an event to indicate test run has failed
    handleMcpEvent({
      type: McpEventType.ERROR,
      message: `Error running checks on specs: ${specTarget || 'all'}`,
      error,
      timestamp: Date.now()
    });
  }
}

/**
 * Create a new spec from description
 */
async function createSpec(description: string, files?: string[]) {
  try {
    // Generate command with optional files
    let command = `node dist/index.js gen "${description}"`;
    
    // Add the files if provided
    if (files && files.length > 0) {
      const filesJson = JSON.stringify(files);
      command = `node dist/index.js create --json '{"feature": "${description}", "files": ${filesJson}}'`;
    }
    
    // Create an event to indicate spec creation has started
    handleMcpEvent({
      type: McpEventType.START,
      message: `Creating spec for: ${description}`,
      timestamp: Date.now()
    });
    
    // Run the command
    execSync(command, { stdio: 'inherit' });
    
    // Create an event to indicate spec creation has completed
    handleMcpEvent({
      type: McpEventType.COMPLETE,
      message: `Created spec for: ${description}`,
      result: true,
      timestamp: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error creating spec:', error);
    
    // Create an event to indicate spec creation has failed
    handleMcpEvent({
      type: McpEventType.ERROR,
      message: `Error creating spec for: ${description}`,
      error,
      timestamp: Date.now()
    });
    
    return false;
  }
}

/**
 * Route Cursor MCP events to CheckMate commands
 */
export async function routeEvent(event: any) {
  console.log(`🔄 Received event: ${event?.type || 'unknown'}`);
  
  try {
    switch (event?.type) {
      case 'task.started':
        if (event.task?.description) {
          console.log(`📝 Generating spec for: "${event.task.description}"`);
          
          // Create a spec from the task description
          await createSpec(event.task.description, event.task?.files);
        } else {
          console.log('❌ No task description provided');
        }
        break;
        
      case 'task.finished':
        console.log('🧪 Running checks on affected specs');
        
        // Run affected specs if available
        if (event.affected) {
          await runTests(event.affected.join(','));
        } else {
          // Get affected specs from git
          const affectedCommand = 'node dist/index.js affected --json';
          try {
            const affected = JSON.parse(execSync(affectedCommand, { encoding: 'utf8' }));
            if (affected && affected.length > 0) {
              await runTests(affected.join(','));
            } else {
              // Run all specs if no affected specs found
              await runTests();
            }
          } catch (error) {
            // Run all specs if error getting affected specs
            await runTests();
          }
        }
        break;
        
      case 'spec.create':
        // Handle explicit spec creation
        if (event.spec?.description) {
          await createSpec(event.spec.description, event.spec?.files);
        } else {
          console.log('❌ No spec description provided for spec.create event');
        }
        break;
        
      case 'spec.run':
        // Handle explicit spec running
        if (event.spec?.target) {
          await runTests(event.spec.target);
        } else {
          await runTests();
        }
        break;
        
      default:
        console.log(`ℹ️ Unhandled MCP event: ${event?.type || 'unknown'}`);
    }
  } catch (error) {
    console.error('❌ Error processing event:', error);
  }

  return { ok: true };
} 