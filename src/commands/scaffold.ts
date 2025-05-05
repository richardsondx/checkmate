/**
 * Scaffold command for CheckMate CLI
 * Quickly generate spec templates with the new YAML format
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createSlug } from '../lib/specs.js';
import { stringify } from 'yaml';
import { load as loadConfig } from '../lib/config.js';

const execAsync = promisify(exec);

interface ScaffoldOptions {
  title?: string;
  files?: string[];
  requirements?: string[];
  output?: string;
  open?: boolean;
}

// Define the Spec interface locally to avoid dependency issues
interface Spec {
  title: string;
  files: string[];
  checks: { id: string; require: string; test?: string; status?: boolean }[];
}

// Function to write a spec to a file
function writeSpec(spec: Spec, filePath: string): void {
  try {
    // Convert to YAML
    const yamlContent = stringify(spec);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(filePath, yamlContent, 'utf8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error writing spec to ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Scaffold a new spec file
 */
export async function scaffoldSpec(specPath: string, options: ScaffoldOptions): Promise<string> {
  const spinner = ora('Creating spec scaffold...').start();
  
  try {
    // Determine the title
    const title = options.title || path.basename(specPath, path.extname(specPath))
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Create a slug for the file name if not provided
    const slug = createSlug(title);
    
    // Determine output path
    const config = loadConfig();
    const outputDir = path.join(process.cwd(), 'checkmate/specs');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine the output file path
    const outputPath = options.output || path.join(outputDir, `${slug}.yaml`);
    
    // Create spec object
    const spec: Spec = {
      title,
      files: options.files || [],
      checks: (options.requirements || []).map((req, index) => ({
        id: `req-${index + 1}`,
        require: req,
        test: '// TODO: Add test code here'
      }))
    };
    
    // If no checks were provided, add an empty one
    if (spec.checks.length === 0) {
      spec.checks.push({
        id: 'req-1',
        require: 'TODO: Add requirement',
        test: '// TODO: Add test code here'
      });
    }
    
    // Write the spec to file
    writeSpec(spec, outputPath);
    
    spinner.succeed(`Created spec scaffold: ${chalk.green(outputPath)}`);
    
    // Open the file in editor if requested
    if (options.open) {
      const editor = process.env.EDITOR || 'vi';
      spinner.text = `Opening in ${editor}...`;
      
      try {
        if (process.platform === 'darwin' && editor === 'open') {
          await execAsync(`open -e "${outputPath}"`);
        } else {
          await execAsync(`${editor} "${outputPath}"`);
        }
        spinner.succeed(`Opened ${outputPath} in ${editor}`);
      } catch (err) {
        spinner.warn(`Could not open file in editor: ${err}`);
      }
    }
    
    return outputPath;
  } catch (error) {
    spinner.fail(`Error creating spec scaffold: ${error}`);
    throw error;
  }
}

/**
 * Parse arguments for scaffold command
 */
export function parseScaffoldArgs(args: any): ScaffoldOptions {
  return {
    title: args.title,
    files: args.file ? (Array.isArray(args.file) ? args.file : [args.file]) : [],
    requirements: args.require ? (Array.isArray(args.require) ? args.require : [args.require]) : [],
    output: args.output,
    open: args.open || false
  };
} 