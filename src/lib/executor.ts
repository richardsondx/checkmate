/**
 * Executor for CheckMate CLI
 * Runs spec requirements and checks their status
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';
import * as specs from './specs.js';

// Directory for logs
const LOGS_DIR = 'checkmate/logs';

// Log file for runs
const RUN_LOG_FILE = path.join(LOGS_DIR, 'run.log');

/**
 * Ensure the logs directory exists
 */
function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Simple executor for a requirement
 * In a future implementation, this would integrate with real testing
 * For now, it's a stub that always passes (or sometimes fails for demonstration)
 */
export async function executeRequirement(
  requirement: string, 
  filePath: string
): Promise<boolean> {
  // For demonstration, we'll make requirements pass most of the time
  // but occasionally fail to show the functionality
  // In a real implementation, this would actually test the code
  
  // Convert to lowercase for consistent comparison
  const text = requirement.toLowerCase();
  
  // Check for keywords that might indicate validation requirements
  // These will sometimes fail for demo purposes
  if (text.includes('validate') || text.includes('check') || text.includes('verify')) {
    // 20% chance of failing
    return Math.random() > 0.2;
  }
  
  // Success by default for demo
  return true;
}

/**
 * Update a spec file with new requirement statuses
 */
export function updateSpec(
  filePath: string, 
  requirements: Array<{ text: string; status: boolean }>
): void {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let inRequirementsSection = false;
  let requirementIndex = 0;
  
  // Go through each line and update the requirements
  const updatedLines = lines.map(line => {
    if (line.startsWith('## Requirements')) {
      inRequirementsSection = true;
      return line;
    } else if (inRequirementsSection && line.startsWith('##')) {
      inRequirementsSection = false;
      return line;
    }
    
    if (inRequirementsSection && (line.startsWith('- [ ]') || 
                                  line.startsWith('- [x]') || 
                                  line.startsWith('- [X]') || 
                                  line.startsWith('- [✓]') || 
                                  line.startsWith('- [✔]') ||
                                  line.startsWith('- [✖]'))) {
      if (requirementIndex < requirements.length) {
        const req = requirements[requirementIndex];
        requirementIndex++;
        
        // Get just the text part without the checkbox
        const text = line.substring(line.indexOf(']') + 1).trim();
        
        // Replace with updated status
        return req.status ? `- [✔] ${text}` : `- [✖] ${text}`;
      }
    }
    
    return line;
  });
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf8');
}

/**
 * Reset all requirements in a spec to unchecked
 */
export function resetSpec(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let inRequirementsSection = false;
  
  // Go through each line and reset all requirements
  const updatedLines = lines.map(line => {
    if (line.startsWith('## Requirements')) {
      inRequirementsSection = true;
      return line;
    } else if (inRequirementsSection && line.startsWith('##')) {
      inRequirementsSection = false;
      return line;
    }
    
    if (inRequirementsSection && (line.startsWith('- [') && line.includes(']'))) {
      // Get just the text part without the checkbox
      const text = line.substring(line.indexOf(']') + 1).trim();
      
      // Reset to unchecked
      return `- [ ] ${text}`;
    }
    
    return line;
  });
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf8');
}

/**
 * Log the result of a run
 */
export function logRun(
  specPath: string, 
  success: boolean, 
  requirements: Array<{ text: string; status: boolean }>
): void {
  const config = loadConfig();
  
  // If logging is off, don't log
  if (config.log === 'off') {
    return;
  }
  
  // If logging is optional and we succeeded, don't log
  if (config.log === 'optional' && success) {
    return;
  }
  
  // Format pass/fail counts
  const total = requirements.length;
  const passed = requirements.filter(r => r.status).length;
  
  // Create a log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    spec: path.basename(specPath),
    success,
    total,
    passed,
    requirements: requirements.map(r => ({ text: r.text, status: r.status }))
  };
  
  // Ensure logs directory exists
  ensureLogsDir();
  
  // Append to the log file
  fs.appendFileSync(
    RUN_LOG_FILE, 
    JSON.stringify(logEntry) + '\n', 
    { flag: 'a' }
  );
} 