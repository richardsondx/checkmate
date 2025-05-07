/**
 * Promote command for CheckMate CLI
 * Converts a Markdown spec to a YAML skeleton and save it in the agents folder
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { parseSpec, getSpecByName, Requirement } from '../lib/specs.js';
import { callModel } from '../lib/models.js';
import { stringify as stringifyYaml } from 'yaml';

const SPECS_DIR = 'checkmate/specs';
const AGENTS_DIR = path.join(SPECS_DIR, 'agents');

// Ensure the agents directory exists
function ensureAgentsDir(): void {
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
}

/**
 * Convert a markdown spec to a YAML agent spec
 */
export async function promoteToAgent(specSlug: string, options: { selectedOnly?: boolean } = {}): Promise<string | null> {
  try {
    const specPaths = await getSpecByName(specSlug);
    if (!specPaths || specPaths.length === 0) {
      console.error(chalk.red(`❌ Error: Spec "${specSlug}" not found`));
      return null;
    }
    
    // Use the first matching spec
    const specPath = specPaths[0];
    
    // Parse the spec
    const spec = parseSpec(specPath);
    const fileName = path.basename(specPath).replace(/\.md$/, '.yaml');
    const outputPath = path.join(AGENTS_DIR, fileName);
    
    // Ensure the agents directory exists
    ensureAgentsDir();
    
    // Generate test placeholders for each requirement
    let requirements = [...spec.requirements];
    
    // If selectedOnly is true, only include requirements that are not checked (failing)
    if (options.selectedOnly) {
      // For Markdown files, we check the status by looking for "[x]" vs "[ ]"
      if (typeof specPath === 'string' && specPath.endsWith('.md')) {
        const fileContent = fs.readFileSync(specPath, 'utf8');
        requirements = requirements.filter(req => {
          // For each requirement, check if it appears as "- [x]" (checked, passing) in the file
          const requireWithCheckbox = `- [x] ${req.require}`;
          return !fileContent.includes(requireWithCheckbox);
        });
      } else {
        // For YAML files, use the status property directly
        requirements = requirements.filter(req => !req.status);
      }
    }
    
    const yamlRequirements = requirements.map(req => ({
      id: req.id,
      require: req.require,
      test: "// TODO: Add test code to verify this requirement", 
      status: req.status || false
    }));
    
    // Create YAML structure
    const yamlSpec = {
      title: spec.title,
      files: spec.files || [],
      requirements: yamlRequirements
    };
    
    // Convert to YAML and save
    const yamlContent = stringifyYaml(yamlSpec);
    
    // Write to file
    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    
    console.log(chalk.green(`✅ Spec promoted to agent at ${outputPath}`));
    return outputPath;
  } catch (error) {
    console.error(chalk.red('❌ Error promoting spec:'), error);
    return null;
  }
}

/**
 * The promote command handler
 */
export async function promoteCommand(options: { spec?: string; selectedOnly?: boolean }): Promise<void> {
  const spinner = ora('Promoting Markdown spec to agent YAML...').start();
  
  try {
    if (!options.spec) {
      spinner.fail('No spec provided. Use --spec to specify a spec to promote.');
      return;
    }
    
    const specPath = await promoteToAgent(options.spec, { selectedOnly: options.selectedOnly });
    
    if (specPath) {
      spinner.succeed(`Spec promoted successfully to ${specPath}`);
    } else {
      spinner.fail('Failed to promote spec');
    }
  } catch (error) {
    spinner.fail(`Error promoting spec: ${error}`);
  }
}

/**
 * Generate a test block for a requirement using AI
 */
async function generateTestBlock(requirement: string, files: string[]): Promise<string> {
  // Skip if files array is empty
  if (files.length === 0) {
    return '// TODO: Add test code to verify this requirement';
  }
  
  try {
    // Build context with file paths
    const filesList = files.map(file => `- ${file}`).join('\n');
    
    // Create the prompt for generating a test
    const prompt = `Create a JavaScript/TypeScript test snippet for the following requirement:
    
Requirement: ${requirement}

This requirement involves these files:
${filesList}

The test should:
1. Import necessary modules/files
2. Set up test conditions
3. Execute the relevant code
4. Assert the expected outcome

Return ONLY the code with no explanation or markdown formatting. The code should be wrapped in a try/catch block.`;

    const systemPrompt = `You are a senior test engineer specializing in creating concise, targeted test code.
Generate executable JavaScript/TypeScript test code that could be run to verify the requirement.
Focus on practical tests that check functionality directly.
Include proper imports, setup, execution, and assertions.
Return ONLY the code snippet with no explanation, comments, or markdown.`;

    // Call the model to generate the test block
    const testCode = await callModel('reason', systemPrompt, prompt);
    
    // Clean up the response if it contains markdown code fences
    return testCode.replace(/```(javascript|typescript|js|ts)?\n/g, '').replace(/```$/g, '');
    
  } catch (error) {
    console.error('Error generating test block:', error);
    return '// TODO: Add test code to verify this requirement';
  }
} 