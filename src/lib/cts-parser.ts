/**
 * CheckMate Test Script (cts) parser and executor
 * Provides a Mini-DSL for writing simpler tests in Agent YAML files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import axios from 'axios';

// DSL Command types
type CommandType = 'http' | 'db' | 'file' | 'exec' | 'assert';

// HTTP Methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Parsed command
interface Command {
  type: CommandType;
  target: string;
  expectation?: string;
  payload?: any;
  variable?: string;
}

// Test result
interface TestResult {
  success: boolean;
  message: string;
  line: number;
  context?: any;
}

// Context storage for variables
interface TestContext {
  [key: string]: any;
}

/**
 * Parse CheckMate Test Script (cts) syntax
 */
export function parseTestScript(script: string): Command[] {
  const lines = script.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const commands: Command[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const command = parseLine(line);
      if (command) {
        commands.push(command);
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${line}`, error);
      throw new Error(`Syntax error in test script at line ${i + 1}: ${error}`);
    }
  }
  
  return commands;
}

/**
 * Parse a single line of cts syntax
 */
function parseLine(line: string): Command | null {
  if (!line.trim()) return null;
  
  // Regular expressions for different command patterns
  const httpRegex = /^http\s+(GET|POST|PUT|DELETE|PATCH)\s+(\S+)(?:\s+=>\s+(\S+))?(?:\s+WITH\s+(\{.*\}))?(?:\s+AS\s+(\w+))?$/;
  const dbRegex = /^db\s+(\S+)(?:\s+=>\s+(.+))?(?:\s+AS\s+(\w+))?$/;
  const fileRegex = /^file\s+(\S+)(?:\s+=>\s+(.+))?$/;
  const execRegex = /^exec\s+(.+?)(?:\s+=>\s+(.+))?(?:\s+AS\s+(\w+))?$/;
  const assertRegex = /^assert\s+(.+)$/;
  
  // Try to match against different command patterns
  let match;
  
  // Parse HTTP commands
  if ((match = httpRegex.exec(line))) {
    const [_, method, url, expectation, payloadStr, variable] = match;
    let payload;
    
    if (payloadStr) {
      try {
        payload = JSON.parse(payloadStr);
      } catch (e) {
        throw new Error(`Invalid JSON in WITH clause: ${payloadStr}`);
      }
    }
    
    return {
      type: 'http',
      target: `${method} ${url}`,
      expectation,
      payload,
      variable
    };
  }
  
  // Parse DB commands
  if ((match = dbRegex.exec(line))) {
    const [_, query, expectation, variable] = match;
    return {
      type: 'db',
      target: query,
      expectation,
      variable
    };
  }
  
  // Parse File commands
  if ((match = fileRegex.exec(line))) {
    const [_, filePath, expectation] = match;
    return {
      type: 'file',
      target: filePath,
      expectation
    };
  }
  
  // Parse Exec commands
  if ((match = execRegex.exec(line))) {
    const [_, command, expectation, variable] = match;
    return {
      type: 'exec',
      target: command,
      expectation,
      variable
    };
  }
  
  // Parse Assert commands
  if ((match = assertRegex.exec(line))) {
    const [_, expression] = match;
    return {
      type: 'assert',
      target: expression
    };
  }
  
  throw new Error(`Unknown command syntax: ${line}`);
}

/**
 * Execute a test script
 */
export async function executeTestScript(script: string): Promise<TestResult> {
  try {
    // Parse the script into commands
    const commands = parseTestScript(script);
    
    // Initialize context for variable storage
    const context: TestContext = {};
    
    // Execute each command in sequence
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const lineNumber = i + 1;
      
      try {
        // Execute the command
        const result = await executeCommand(command, context);
        
        // If the command failed, return the failure
        if (!result.success) {
          return {
            success: false,
            message: result.message,
            line: lineNumber,
            context
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Error executing command at line ${lineNumber}: ${error}`,
          line: lineNumber,
          context
        };
      }
    }
    
    // All commands executed successfully
    return {
      success: true,
      message: `All ${commands.length} tests passed successfully`,
      line: commands.length,
      context
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing test script: ${error}`,
      line: 0
    };
  }
}

/**
 * Execute a single command
 */
async function executeCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  switch (command.type) {
    case 'http':
      return executeHttpCommand(command, context);
    case 'db':
      return executeDbCommand(command, context);
    case 'file':
      return executeFileCommand(command, context);
    case 'exec':
      return executeExecCommand(command, context);
    case 'assert':
      return executeAssertCommand(command, context);
    default:
      return {
        success: false,
        message: `Unknown command type: ${command.type}`
      };
  }
}

/**
 * Execute an HTTP command
 */
async function executeHttpCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  try {
    // Parse method and URL
    const [method, url] = command.target.split(' ') as [HttpMethod, string];
    
    // Make HTTP request
    let response;
    
    try {
      switch (method) {
        case 'GET':
          response = await axios.get(url);
          break;
        case 'POST':
          response = await axios.post(url, command.payload || {});
          break;
        case 'PUT':
          response = await axios.put(url, command.payload || {});
          break;
        case 'DELETE':
          response = await axios.delete(url);
          break;
        case 'PATCH':
          response = await axios.patch(url, command.payload || {});
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error: any) {
      // Even if request fails, we still need to check if the status code matches the expectation
      if (error.response) {
        response = error.response;
      } else {
        throw error;
      }
    }
    
    // Store in context if variable is provided
    if (command.variable) {
      context[command.variable] = {
        status: response.status,
        body: response.data,
        headers: response.headers
      };
    }
    
    // Check expectation if provided
    if (command.expectation) {
      // Check for status code
      if (/^\d+$/.test(command.expectation)) {
        const expectedStatus = parseInt(command.expectation, 10);
        if (response.status !== expectedStatus) {
          return {
            success: false,
            message: `Expected HTTP status ${expectedStatus}, got ${response.status}`
          };
        }
      } else {
        // Other types of expectations can be added here
        return {
          success: false,
          message: `Unsupported expectation format: ${command.expectation}`
        };
      }
    }
    
    return {
      success: true,
      message: `HTTP ${method} ${url} succeeded with status ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      message: `HTTP request failed: ${error}`
    };
  }
}

/**
 * Execute a database command
 */
async function executeDbCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  // For now, return a not implemented message
  // This would connect to the database and run queries in a real implementation
  return {
    success: false,
    message: 'Database commands not yet implemented'
  };
}

/**
 * Execute a file command
 */
async function executeFileCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  try {
    const filePath = command.target;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`
      };
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check expectation if provided
    if (command.expectation) {
      // Check for contains
      if (command.expectation.startsWith('contains ')) {
        const expectedText = command.expectation.substring('contains '.length).trim();
        if (!content.includes(expectedText)) {
          return {
            success: false,
            message: `File does not contain: "${expectedText}"`
          };
        }
      } else {
        return {
          success: false,
          message: `Unsupported file expectation: ${command.expectation}`
        };
      }
    }
    
    return {
      success: true,
      message: `File check succeeded for ${filePath}`
    };
  } catch (error) {
    return {
      success: false,
      message: `File command failed: ${error}`
    };
  }
}

/**
 * Execute a shell command
 */
async function executeExecCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  try {
    // Execute shell command
    const output = child_process.execSync(command.target, {
      encoding: 'utf8',
      timeout: 5000, // 5 second timeout
      windowsHide: true
    }).trim();
    
    // Store in context if variable is provided
    if (command.variable) {
      context[command.variable] = output;
    }
    
    // Check expectation if provided
    if (command.expectation) {
      // Check for startsWith
      if (command.expectation.startsWith('startsWith ')) {
        const expectedPrefix = command.expectation.substring('startsWith '.length).trim();
        if (!output.startsWith(expectedPrefix)) {
          return {
            success: false,
            message: `Command output does not start with: "${expectedPrefix}"`
          };
        }
      }
      // Add more expectation checks as needed
    }
    
    return {
      success: true,
      message: `Command executed successfully: ${command.target}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Command execution failed: ${error}`
    };
  }
}

/**
 * Execute an assertion
 */
async function executeAssertCommand(command: Command, context: TestContext): Promise<{ success: boolean, message: string }> {
  try {
    // Replace variable references with their values
    const expression = command.target.replace(/(\w+)\.(\w+(?:\[\d+\])?(?:\.\w+)*)/g, (match, varName, property) => {
      if (context[varName]) {
        return `context["${varName}"]${property.startsWith('[') ? '' : '.'}${property}`;
      }
      return match;
    });
    
    // Create a safe function to evaluate the expression
    const assertFn = new Function('context', `return Boolean(${expression});`);
    
    // Evaluate the assertion
    const result = assertFn(context);
    
    if (!result) {
      return {
        success: false,
        message: `Assertion failed: ${command.target}`
      };
    }
    
    return {
      success: true,
      message: `Assertion passed: ${command.target}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Assertion error: ${error}`
    };
  }
}

/**
 * Generate JavaScript code from a test script
 * This converts the DSL to executable JS for the executor
 */
export function generateJsFromTestScript(script: string): string {
  const commands = parseTestScript(script);
  
  // Generate JS code
  let jsCode = `// Generated from CheckMate Test Script (cts)\n`;
  jsCode += `async function runTest() {\n`;
  jsCode += `  const context = {};\n\n`;
  
  for (const command of commands) {
    // Add command as comment
    jsCode += `  // ${command.type} ${command.target}`;
    if (command.expectation) jsCode += ` => ${command.expectation}`;
    if (command.variable) jsCode += ` AS ${command.variable}`;
    jsCode += `\n`;
    
    // Generate code based on command type
    switch (command.type) {
      case 'http':
        jsCode += generateHttpCommandCode(command);
        break;
      case 'db':
        jsCode += generateDbCommandCode(command);
        break;
      case 'file':
        jsCode += generateFileCommandCode(command);
        break;
      case 'exec':
        jsCode += generateExecCommandCode(command);
        break;
      case 'assert':
        jsCode += generateAssertCommandCode(command);
        break;
    }
    
    jsCode += `\n`;
  }
  
  jsCode += `  return true;\n`;
  jsCode += `}\n\n`;
  jsCode += `module.exports = runTest();\n`;
  
  return jsCode;
}

/**
 * Generate JS code for an HTTP command
 */
function generateHttpCommandCode(command: Command): string {
  const [method, url] = command.target.split(' ');
  
  let code = `  try {\n`;
  code += `    const response = await axios.${method.toLowerCase()}("${url}"`;
  
  if (command.payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    code += `, ${JSON.stringify(command.payload)}`;
  }
  
  code += `);\n`;
  
  if (command.variable) {
    code += `    context["${command.variable}"] = {\n`;
    code += `      status: response.status,\n`;
    code += `      body: response.data,\n`;
    code += `      headers: response.headers\n`;
    code += `    };\n`;
  }
  
  if (command.expectation && /^\d+$/.test(command.expectation)) {
    code += `    if (response.status !== ${command.expectation}) {\n`;
    code += `      throw new Error(\`Expected HTTP status ${command.expectation}, got \${response.status}\`);\n`;
    code += `    }\n`;
  }
  
  code += `  } catch (error) {\n`;
  code += `    // Check if error has response (for status code validations)\n`;
  code += `    if (error.response && "${command.expectation}" === String(error.response.status)) {\n`;
  code += `      // Expected error status\n`;
  if (command.variable) {
    code += `      context["${command.variable}"] = {\n`;
    code += `        status: error.response.status,\n`;
    code += `        body: error.response.data,\n`;
    code += `        headers: error.response.headers\n`;
    code += `      };\n`;
  }
  code += `    } else {\n`;
  code += `      throw error;\n`;
  code += `    }\n`;
  code += `  }\n`;
  
  return code;
}

/**
 * Generate JS code for a database command
 */
function generateDbCommandCode(command: Command): string {
  // Simplified placeholder for now
  return `  // DB command: Placeholder for actual database interaction\n`;
}

/**
 * Generate JS code for a file command
 */
function generateFileCommandCode(command: Command): string {
  let code = `  const fs = require('fs');\n`;
  code += `  if (!fs.existsSync("${command.target}")) {\n`;
  code += `    throw new Error("File not found: ${command.target}");\n`;
  code += `  }\n`;
  code += `  const fileContent = fs.readFileSync("${command.target}", "utf8");\n`;
  
  if (command.expectation && command.expectation.startsWith('contains ')) {
    const expectedText = command.expectation.substring('contains '.length).trim();
    code += `  if (!fileContent.includes("${expectedText}")) {\n`;
    code += `    throw new Error("File does not contain expected text");\n`;
    code += `  }\n`;
  }
  
  return code;
}

/**
 * Generate JS code for an exec command
 */
function generateExecCommandCode(command: Command): string {
  let code = `  const childProcess = require('child_process');\n`;
  code += `  try {\n`;
  code += `    const cmdOutput = childProcess.execSync("${command.target.replace(/"/g, '\\"')}", {\n`;
  code += `      encoding: "utf8",\n`;
  code += `      timeout: 5000\n`; 
  code += `    }).trim();\n`;
  
  if (command.variable) {
    code += `    context["${command.variable}"] = cmdOutput;\n`;
  }
  
  if (command.expectation && command.expectation.startsWith('startsWith ')) {
    const expectedPrefix = command.expectation.substring('startsWith '.length).trim();
    code += `    if (!cmdOutput.startsWith("${expectedPrefix}")) {\n`;
    code += `      throw new Error("Command output does not start with expected text");\n`;
    code += `    }\n`;
  }
  
  code += `  } catch (error) {\n`;
  code += `    throw new Error(\`Command execution failed: \${error.message}\`);\n`;
  code += `  }\n`;
  
  return code;
}

/**
 * Generate JS code for an assert command
 */
function generateAssertCommandCode(command: Command): string {
  // Replace variable references with proper object access
  const processedAssertion = command.target.replace(/(\w+)\.(\w+(?:\[\d+\])?(?:\.\w+)*)/g, 
    (match, varName, property) => {
      return `context["${varName}"]${property.startsWith('[') ? '' : '.'}${property}`;
    });
  
  let code = `  if (!(${processedAssertion})) {\n`;
  code += `    throw new Error("Assertion failed: ${command.target.replace(/"/g, '\\"')}");\n`;
  code += `  }\n`;
  
  return code;
}

/**
 * Convert JavaScript test code to CheckMate Test Script (cts)
 * This is useful for promotion from raw JS to the DSL
 */
export function convertJsToTestScript(jsCode: string): string {
  // Simplified conversion - in a real implementation this would be more sophisticated
  // using AST parsing to properly convert JS to the DSL
  
  const lines = jsCode.split('\n');
  const ctsLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Convert HTTP requests
    if (trimmed.includes('axios.get(') || trimmed.includes('axios.post(')) {
      if (trimmed.includes('axios.get(')) {
        const urlMatch = trimmed.match(/axios\.get\(['"](.+?)['"]/);
        if (urlMatch) {
          ctsLines.push(`http GET ${urlMatch[1]}`);
        }
      } else if (trimmed.includes('axios.post(')) {
        const matches = trimmed.match(/axios\.post\(['"](.+?)['"](?:,\s*(\{.+?\}))?/);
        if (matches) {
          const url = matches[1];
          const payload = matches[2];
          if (payload) {
            ctsLines.push(`http POST ${url} WITH ${payload}`);
          } else {
            ctsLines.push(`http POST ${url}`);
          }
        }
      }
    }
    // Convert assertions
    else if (trimmed.startsWith('if (') && trimmed.includes('===')) {
      const condition = trimmed.substring(4, trimmed.length - 2); // Remove "if (" and ") {"
      ctsLines.push(`assert ${condition}`);
    }
    // Convert throw statements to comments
    else if (trimmed.startsWith('throw new Error(')) {
      const errorMsg = trimmed.match(/throw new Error\(['"](.+?)['"]\)/);
      if (errorMsg) {
        ctsLines.push(`# Error case: ${errorMsg[1]}`);
      }
    }
  }
  
  return ctsLines.join('\n');
} 