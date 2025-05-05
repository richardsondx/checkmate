/**
 * MCP (Middleware Control Protocol) event handling for CheckMate
 * Provides functions for handling events from the MCP system
 */

/**
 * MCP event types
 */
export enum McpEventType {
  START = 'start',
  PROGRESS = 'progress',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * MCP event interface
 */
export interface McpEvent {
  type: McpEventType;
  requirementId?: string;
  specPath?: string;
  message?: string;
  progress?: number;
  result?: boolean;
  error?: any;
  timestamp: number;
}

/**
 * Handle MCP events
 */
export function handleMcpEvent(event: McpEvent): void {
  // Just a stub implementation to make the import work
  const timestamp = new Date(event.timestamp || Date.now()).toISOString();
  
  console.log(`[MCP] ${timestamp} - ${event.type}: ${event.message || '(no message)'}`);
} 