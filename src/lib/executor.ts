/**
 * Executor for CheckMate CLI
 * Runs spec requirements and checks their status
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as loadConfig } from './config.js';
import * as specs from './specs.js';
import { callModel } from './models.js';

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
 * Evaluate a requirement using the AI model
 */
export async function executeRequirement(
  requirement: string, 
  filePath: string
): Promise<boolean> {
  try {
    console.log(`Evaluating requirement: "${requirement}"`);
    
    // Get the spec data
    const specData = specs.parseSpec(filePath);
    
    // Get the file paths from the spec
    const fileList = specData.files;
    
    // Gather code samples from the files (limited for demo)
    let codeContext = '';
    for (const file of fileList) {
      try {
        if (fs.existsSync(file)) {
          // Read the first 100 lines or so from each file
          const content = fs.readFileSync(file, 'utf8')
            .split('\n')
            .slice(0, 100)
            .join('\n');
          
          codeContext += `\nFile: ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
        }
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    // Create a context prompt for the model
    const contextPrompt = `
Feature: ${specData.title}

Requirement to evaluate: ${requirement}

Code Context:
${codeContext.length > 0 ? codeContext : "No code files available for context."}

Please evaluate if the requirement is met by this code.
Reply with "pass" or "fail" and a brief explanation.
`;

    // System prompt for the evaluation model
    const systemPrompt = `You are a strict test evaluator. 
Your job is to determine if the described requirement has been met based on the code and context.
Answer with exactly "pass" or "fail" at the start of your response, followed by a brief explanation.
Be very strict in your evaluation - if there's no clear evidence the requirement is fulfilled, fail it.
`;

    // Call the model
    const response = await callModel('quick', systemPrompt, contextPrompt);
    
    // Parse the response
    const isPassing = response.toLowerCase().trim().startsWith('pass');
    
    console.log(`Evaluation result: ${isPassing ? 'PASS' : 'FAIL'}`);
    return isPassing;
  } catch (error) {
    console.error('Error evaluating requirement:', error);
    
    // In case of failure, return false to be safe
    return false;
  }
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