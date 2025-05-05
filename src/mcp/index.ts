#!/usr/bin/env ts-node

/**
 * CheckMate MCP Server
 * Entry point for Cursor integration
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { printBanner } from '../ui/banner.js';
import { routeEvent } from './router.js';
import { load as loadConfig } from '../lib/config.js';

// Print the banner to show we're starting
printBanner();

// Generate a token on startup for authentication
const SERVER_TOKEN = crypto.randomBytes(32).toString('hex');

// Get port from environment or use default
const PORT = process.env.CHECKMATE_MCP_PORT ? parseInt(process.env.CHECKMATE_MCP_PORT) : 8765;

// Load config for API keys
const config = loadConfig();

/**
 * Authenticate a request using token or API keys
 */
function authenticate(req: http.IncomingMessage): boolean {
  // Check for server token in header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${SERVER_TOKEN}`) {
    return true;
  }
  
  // Check for API key match (if available)
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    // Check against config keys (openai_key or anthropic_key)
    if (config.openai_key && apiKeyHeader === config.openai_key) {
      return true;
    }
    if (config.anthropic_key && apiKeyHeader === config.anthropic_key) {
      return true;
    }
  }
  
  return false;
}

/**
 * Create HTTP server to handle MCP events
 */
function createServer() {
  const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    // Authenticate the request
    if (!authenticate(req)) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    // Get content length
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 1000000) { // Limit to 1MB
      res.statusCode = 413;
      res.end(JSON.stringify({ error: 'Payload too large' }));
      return;
    }
    
    try {
      // Read the request body
      const bodyChunks: Buffer[] = [];
      for await (const chunk of req) {
        bodyChunks.push(chunk);
      }
      const rawBody = Buffer.concat(bodyChunks).toString();
      
      // Parse the JSON body
      const event = JSON.parse(rawBody);
      
      // Route the event
      const result = await routeEvent(event);
      
      // Send response
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('Error processing request:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`🔄 Starting CheckMate MCP server on port ${PORT}...`);
    console.log(`🔐 Server authentication token: ${SERVER_TOKEN}`);
    console.log(`🔍 Waiting for Cursor events...`);
    
    // Log instructions
    console.log('\n📝 To use with Cursor, add the following to your .cursor/config.json:');
    console.log(`
{
  "mcpServers": {
    "checkmate": {
      "command": "node",
      "args": [
        "dist/mcp/index.js"
      ],
      "env": {
        "CHECKMATE_MODEL_REASON": "${config.models.reason}",
        "CHECKMATE_MODEL_QUICK": "${config.models.quick}"
      }
    }
  }
}
    `);
    
    console.log('✅ CheckMate MCP ready! Press Ctrl+C to stop.');
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down CheckMate MCP server...');
    server.close(() => {
      process.exit(0);
    });
  });
}

// Start the server
createServer(); 