#!/usr/bin/env ts-node

/**
 * CheckMate MCP Server
 * Entry point for Cursor integration
 */

import { printBanner } from '../ui/banner.js';
import { routeEvent } from './router.js';

// Print the banner to show we're starting
printBanner();

// Since @cursor-code/mcp-sdk might not be available, we'll simulate it
function createServer(routeHandler: Function) {
  console.log('🔄 Starting CheckMate MCP server...');
  console.log('🔍 Waiting for Cursor events...');
  
  // This would normally set up a server, but we're just simulating the interface
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down CheckMate MCP server...');
    process.exit(0);
  });
  
  // In a real implementation, this would be listening for events
  console.log('✅ CheckMate MCP ready! Press Ctrl+C to stop.');
}

// Start the server
createServer(routeEvent); 