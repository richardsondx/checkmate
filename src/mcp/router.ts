/**
 * CheckMate MCP Router
 * Handles incoming Cursor events and routes them to the appropriate commands
 */

import { execSync } from 'child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

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
          execSync(`node dist/index.js gen "${event.task.description}"`, { stdio: 'inherit' });
        } else {
          console.log('❌ No task description provided');
        }
        break;
        
      case 'task.finished':
        console.log('🧪 Running checks on affected specs');
        execSync('node dist/index.js run', { stdio: 'inherit' });
        break;
        
      default:
        console.log(`ℹ️ Unhandled MCP event: ${event?.type || 'unknown'}`);
    }
  } catch (error) {
    console.error('❌ Error processing event:', error);
  }

  return { ok: true };
} 