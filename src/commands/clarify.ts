/**
 * CheckMate Clarify Command
 * Explains why a requirement is failing and suggests whether to fix the code or edit the spec
 */
import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import { printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { reason } from '../lib/models.js';
import { getSpecByName, parseSpec } from '../lib/specs.js';

interface ClarifyOptions {
  slug: string;
  bullet?: number;
  format?: 'text' | 'json';
}

interface ClarifyResult {
  suggestion: string;
  next_action: 'edit-spec' | 'fix-code';
  reason: string;
}

/**
 * Clarify command handler
 * Analyzes a failing requirement and suggests a course of action
 */
export async function clarifyCommand(options: ClarifyOptions): Promise<ClarifyResult> {
  // Print welcome banner
  printBanner();
  
  // Load the spec
  const spinner = ora(`Loading spec "${options.slug}"...`).start();
  
  try {
    // Get the spec content
    const specPaths = await getSpecByName(options.slug);
    if (!specPaths || specPaths.length === 0) {
      spinner.fail(`Spec "${options.slug}" not found`);
      throw new Error(`Spec "${options.slug}" not found`);
    }
    
    // Use the first matching spec
    const specPath = specPaths[0];
    
    // Read file content directly
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Parse the spec
    const parsed = parseSpec(specPath);
    spinner.succeed(`Loaded spec "${parsed.title}"`);
    
    // Get requirements array
    const requirements = parsed.checks || parsed.requirements || [];
    
    // Get the relevant requirement if a bullet number is specified
    let requirement = null;
    if (options.bullet) {
      const bulletIndex = options.bullet - 1;
      if (bulletIndex >= 0 && bulletIndex < requirements.length) {
        requirement = requirements[bulletIndex];
        spinner.text = `Analyzing requirement: "${requirement.text || requirement.require}"`;
        spinner.start();
      } else {
        spinner.fail(`Bullet #${options.bullet} not found in spec`);
        throw new Error(`Bullet #${options.bullet} not found in spec`);
      }
    } else {
      // Find the first failing requirement
      requirement = requirements.find(check => !check.status);
      if (requirement) {
        spinner.text = `Analyzing failing requirement: "${requirement.text || requirement.require}"`;
        spinner.start();
      } else {
        spinner.succeed(`All requirements in "${parsed.title}" are passing`);
        return {
          suggestion: "All requirements are passing. No action needed.",
          next_action: "fix-code", // Default, though not relevant when all passing
          reason: "All requirements are already passing"
        };
      }
    }
    
    // Analyze the requirement using the AI model
    const analysis = await analyzeRequirement(
      parsed.title,
      requirement.text || requirement.require,
      parsed.files
    );
    
    spinner.succeed(`Analysis complete`);
    
    // Output the result in the requested format
    if (options.format === 'json') {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      console.log(chalk.bold('\n📝 Requirement Analysis'));
      console.log(chalk.dim('────────────────────────────────────────────────────────'));
      console.log(chalk.cyan(`Requirement: ${requirement.text || requirement.require}`));
      console.log(chalk.dim('────────────────────────────────────────────────────────'));
      console.log(chalk.yellow(`Suggestion: ${analysis.suggestion}`));
      console.log(chalk.green(`Next action: ${analysis.next_action === 'edit-spec' ? 'Edit the spec' : 'Fix the code'}`));
      console.log(chalk.dim(`Reason: ${analysis.reason}`));
    }
    
    return analysis;
  } catch (error: any) {
    spinner.fail('Error analyzing requirement');
    console.error(chalk.red(`Error: ${error.message}`));
    throw error;
  }
}

/**
 * Analyze a requirement to determine why it's failing
 */
async function analyzeRequirement(
  title: string,
  requirement: string,
  files: string[]
): Promise<ClarifyResult> {
  // Prepare prompt for analysis
  const prompt = `
I need to understand why a requirement in my spec is failing and what to do about it.

Spec title: "${title}"
Requirement: "${requirement}"
Related files: ${files.join(', ')}

Please analyze this situation and tell me:
1. What might be causing the requirement to fail?
2. Should I edit the spec requirement or fix the code?
3. What specific change would you recommend?

Return your answer in a JSON format with these fields:
- suggestion: A clear suggestion on what to do
- next_action: Either "edit-spec" or "fix-code"
- reason: The reasoning behind your recommendation
`;

  // Get response from the AI model
  const response = await reason(prompt);
  
  try {
    // Extract and parse the JSON from the model's response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from model response');
    }
    
    const jsonStr = jsonMatch[0];
    const result = JSON.parse(jsonStr) as ClarifyResult;
    
    // Validate the result
    if (!result.suggestion || !result.next_action || !result.reason) {
      throw new Error('Invalid response format');
    }
    
    // Ensure next_action is valid
    if (result.next_action !== 'edit-spec' && result.next_action !== 'fix-code') {
      result.next_action = 'fix-code'; // Default to fixing code if invalid
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing model response:', error);
    // Return a default response
    return {
      suggestion: "Could not determine the cause of failure. Inspect the code and requirement manually.",
      next_action: "fix-code",
      reason: "Failed to analyze the requirement due to an error in the model response"
    };
  }
}

/**
 * Parse command-line arguments for the clarify command
 */
export function parseClarifyArgs(args: any): ClarifyOptions {
  return {
    slug: args.slug || args._[1],
    bullet: args.bullet ? parseInt(args.bullet, 10) : undefined,
    format: args.json ? 'json' : 'text'
  };
} 