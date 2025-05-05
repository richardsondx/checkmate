/**
 * Spec author for CheckMate CLI
 * Generates rich, actionable specifications from feature descriptions and context
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { reason } from './models.js';
import { FeatureStub } from './splitter.js';
import { ContextFile } from './context.js';
import { load as loadConfig } from './config.js';
import { parseSpec, createSlug } from './specs.js';
import { v4 as uuidv4 } from 'uuid';
import { stringify } from 'yaml';
import crypto from 'crypto';

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';
const AGENTS_DIR = path.join(SPECS_DIR, 'agents');

// Ensure the specs directory exists
function ensureSpecsDir(): void {
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
}

// Ensure the agents directory exists
function ensureAgentsDir(): void {
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
}

/**
 * Result of generating a specification
 */
export interface SpecResult {
  path: string;
  spec: Spec;
  slug: string;
  needsMoreContext: boolean;
}

// Add a type definition for Requirement if not already defined
export interface Requirement {
  id: string;
  require: string;
  test?: string;
  status?: boolean;
}

// Alias Check to Requirement for backward compatibility
export type Check = Requirement;

// Define the Spec interface here since we're not importing it anymore
export interface Spec {
  title: string;
  files: string[];
  checks: Check[];
  requirements?: Requirement[]; // For backward compatibility
}

// Function to write a spec to a file (previously imported from parse.js)
export function writeSpec(spec: Spec, filePath: string): void {
  try {
    // Convert to YAML or the appropriate format
    const yaml = JSON.stringify(spec, null, 2);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(filePath, yaml, 'utf8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error writing spec to ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate a rich specification from a feature and context
 */
export async function authorSpec(
  feature: FeatureStub,
  contextFiles: ContextFile[],
  additionalNotes?: string,
  options?: {
    dryRun?: boolean;
    noTest?: boolean;
    agent?: boolean;
  }
): Promise<SpecResult> {
  // Ensure specs directory exists
  ensureSpecsDir();
  
  // Ensure agents directory exists if needed
  if (options?.agent) {
    ensureAgentsDir();
  }
  
  // Prepare the files list with relevance information
  const filesWithReasons = contextFiles
    .map(file => `- ${file.path}${file.reason ? ` (${file.reason})` : ''}`)
    .join('\n');
  
  // Prepare additional notes section if provided
  const notesSection = additionalNotes ? 
    `\n\nAdditional context/checks:\n${additionalNotes}` : '';
  
  // System prompt to guide the reasoning model
  const systemPrompt = `You are a senior software architect specialized in creating detailed, testable specifications.
Your task is to create a comprehensive spec based on a feature description and relevant code files.

${options?.agent ? `
The specification MUST follow this JSON schema:
{
  "title": "Feature title",
  "files": ["path/to/file1.ts", "path/to/file2.ts"],
  "checks": [
    {
      "id": "unique-id-1",
      "require": "Clear requirement statement that can be verified",
      "test": "JavaScript/TypeScript code that tests the requirement"
    }
  ]
}
` : `
The specification should be a Markdown document with:
1. A title based on the feature description
2. A list of relevant files that would be involved in implementing this feature 
3. 4-6 specific, testable checks for this feature (as a checklist with "[ ]" format)
4. Brief notes with any considerations or implementation details
`}

Follow these guidelines:
- Each check must be concrete, testable, and specific (not generic)
${options?.agent ? `- Focus on verification: each test must be runnable JavaScript/TypeScript
- Keep the checks focused and atomic - one clear assertion per check
- The test code should import necessary files and make assertions
- Tests should focus on business logic and API behavior, not UI interactions
- Return valid JSON that will be converted to YAML` : `- Each bullet point should be specific and measurable
- Checks should be testable in isolation
- Use clear language and avoid jargon
- Format checks as a checklist with "[ ]" format`}

If the file list provided contains too many files, select only the most relevant ones (max 10).`;

  // User prompt with the feature and context
  const userPrompt = `Create a detailed, testable specification for this feature:

Feature name: ${feature.title}
Description: ${feature.description}${notesSection}

Here are potentially relevant files (ranked by relevance):
${filesWithReasons}

Generate a specification that:
1. Lists only the most relevant files from above (no more than 10)
2. Provides 3-7 concrete, testable checks 
${options?.agent ? `3. Each test should be executable JavaScript or TypeScript that imports the right modules

Reply ONLY with the JSON specification object.` : `3. Format checks as a checklist with "[ ]" format
4. Include any notes or implementation details that would be helpful

${options?.agent ? 'Reply ONLY with the JSON specification object.' : 'Reply ONLY with the Markdown content, no explanations or additional text.'}`}`;

  try {
    // Call the reasoning model to author the spec
    const result = await reason(userPrompt, systemPrompt);
    
    // Determine file extension and path based on agent flag
    const extension = options?.agent ? '.yaml' : '.md';
    const outputDir = options?.agent ? AGENTS_DIR : SPECS_DIR;
    const filePath = path.join(outputDir, `${feature.slug}${extension}`);
    
    if (options?.agent) {
      // Parse the JSON response for agent specs
      let specObj: Spec;
      try {
        specObj = JSON.parse(result);
      } catch (error) {
        console.error('Error parsing AI response as JSON:', error);
        
        // Try to extract JSON from the response
        const jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                        result.match(/(\{[\s\S]*?\})/);
        
        if (jsonMatch && jsonMatch[1]) {
          try {
            specObj = JSON.parse(jsonMatch[1]);
          } catch (innerError) {
            console.error('Failed to extract JSON from response:', innerError);
            throw new Error('Could not parse AI response as JSON');
          }
        } else {
          throw new Error('AI did not return valid JSON');
        }
      }
      
      // Handle backward compatibility - if the response uses 'requirements' instead of 'checks'
      if (specObj.requirements && !specObj.checks) {
        specObj.checks = specObj.requirements;
      }
      
      // Add unique IDs to checks if missing
      specObj.checks = specObj.checks.map((check: Check) => ({
        ...check,
        id: check.id || `check-${uuidv4().slice(0, 8)}`
      }));
      
      // If noTest option is enabled, remove test blocks
      if (options?.noTest) {
        specObj.checks = specObj.checks.map((check: Check) => ({
          ...check,
          test: check.test || '// TODO: Implement test'
        }));
      }
      
      // Check if the content suggests need for more context
      const needsMoreContext = result.toLowerCase().includes('more context') || 
                             result.toLowerCase().includes('additional context');
      
      if (!options?.dryRun) {
        // Convert to YAML and write
        const yamlContent = stringify(specObj);
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, yamlContent, 'utf8');
      }
      
      return {
        path: filePath,
        spec: specObj,
        slug: feature.slug,
        needsMoreContext
      };
    } else {
      // For markdown specs, just write the content directly
      if (!options?.dryRun) {
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, result, 'utf8');
      }
      
      // Parse the markdown to extract the spec object for consistent return
      const spec = parseMarkdownContent(result, feature.title);
      
      return {
        path: filePath,
        spec,
        slug: feature.slug,
        needsMoreContext: result.toLowerCase().includes('more context') || 
                         result.toLowerCase().includes('additional context')
      };
    }
  } catch (error) {
    console.error('Error generating spec with AI:', error);
    
    if (options?.agent) {
      // Create a fallback spec for agent specs
      const fallbackSpec = createFallbackSpec(feature, contextFiles);
      
      // Determine the file path
      const outputDir = AGENTS_DIR;
      const filePath = path.join(outputDir, `${feature.slug}.yaml`);
      
      if (!options?.dryRun) {
        // Convert to YAML and write
        const yamlContent = stringify(fallbackSpec);
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, yamlContent, 'utf8');
      }
      
      return {
        path: filePath,
        spec: fallbackSpec,
        slug: feature.slug,
        needsMoreContext: true
      };
    } else {
      // Create a fallback markdown spec
      const fallbackMarkdown = createFallbackMarkdown(feature, contextFiles);
      
      // Determine the file path
      const outputDir = SPECS_DIR;
      const filePath = path.join(outputDir, `${feature.slug}.md`);
      
      if (!options?.dryRun) {
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, fallbackMarkdown, 'utf8');
      }
      
      // Parse the markdown to extract the spec object for consistent return
      const spec = parseMarkdownContent(fallbackMarkdown, feature.title);
      
      return {
        path: filePath,
        spec,
        slug: feature.slug,
        needsMoreContext: true
      };
    }
  }
}

/**
 * Parse markdown content to extract a spec object
 */
function parseMarkdownContent(content: string, defaultTitle: string): Spec {
  // Extract title from the first heading
  const titleMatch = content.match(/# (?:Feature: )?(.*?)(?=\n|$)/);
  const title = titleMatch ? titleMatch[1].trim() : defaultTitle;
  
  // Extract files section
  const filesSection = content.match(/(?:##|###) Files\s+([\s\S]*?)(?=##|$)/);
  const files: string[] = [];
  
  if (filesSection && filesSection[1]) {
    const fileLines = filesSection[1].split('\n');
    
    for (const line of fileLines) {
      if (line.trim().startsWith('-')) {
        const filePath = line.trim().substring(1).trim();
        if (filePath) {
          files.push(filePath);
        }
      }
    }
  }
  
  // Try to extract "Checks" section first, fallback to "Requirements" for backward compatibility
  const checksSection = content.match(/(?:##|###) Checks\s+([\s\S]*?)(?=##|$)/);
  const reqSection = !checksSection ? content.match(/(?:##|###) Requirements\s+([\s\S]*?)(?=##|$)/) : null;
  const checks: Check[] = [];
  
  const section = checksSection || reqSection;
  if (section && section[1]) {
    const lines = section[1].split('\n');
    
    for (const line of lines) {
      // Look for checkbox format: - [ ] or - [x]
      const checkMatch = line.match(/- \[([ xX])\] (.*?)(?=\n|$)/);
      
      if (checkMatch) {
        const status = checkMatch[1].toLowerCase() === 'x';
        const text = checkMatch[2].trim();
        
        // Create a check with an ID
        checks.push({
          id: crypto.randomBytes(4).toString('hex'),
          require: text,
          status
        });
      }
    }
  }
  
  return {
    title,
    files,
    checks,
    requirements: checks // For backward compatibility
  };
}

/**
 * Create a fallback markdown spec
 */
function createFallbackMarkdown(feature: FeatureStub, contextFiles: ContextFile[]): string {
  // Select top files (max 10)
  const topFiles = contextFiles.slice(0, 10).map(file => file.path);
  
  // Create a basic markdown template
  return `# Feature: ${feature.title}

## Files
${topFiles.map(file => `- ${file}`).join('\n')}

## Checks
- [ ] Implement basic structure for ${feature.title}
- [ ] Process data correctly
- [ ] Handle edge cases and errors

## Notes
- Created: ${new Date().toISOString().split('T')[0]}
- Status: Draft
`;
}

/**
 * Create a fallback spec if AI generation fails
 */
function createFallbackSpec(feature: FeatureStub, contextFiles: ContextFile[]): Spec {
  // Select top files (max 10)
  const topFiles = contextFiles.slice(0, 10).map(file => file.path);
  
  // Create a basic template
  return {
    title: feature.title,
    files: topFiles,
    checks: [
      {
        id: 'check-1',
        require: `Implement basic structure for ${feature.title}`,
        test: `// TODO: Implement test for basic structure
import { /* import needed modules */ } from '...';

// Write test code here
// Example:
// const result = someFunction();
// if (!result) throw new Error('Test failed');`
      },
      {
        id: 'check-2',
        require: 'Process data correctly',
        test: `// TODO: Implement test for data processing
import { /* import needed modules */ } from '...';

// Write test code here`
      },
      {
        id: 'check-3',
        require: 'Handle edge cases and errors',
        test: `// TODO: Implement test for error handling
import { /* import needed modules */ } from '...';

// Write test code here`
      }
    ],
    requirements: [ // For backward compatibility
      {
        id: 'check-1',
        require: `Implement basic structure for ${feature.title}`,
        test: `// TODO: Implement test for basic structure
import { /* import needed modules */ } from '...';

// Write test code here
// Example:
// const result = someFunction();
// if (!result) throw new Error('Test failed');`
      },
      {
        id: 'check-2',
        require: 'Process data correctly',
        test: `// TODO: Implement test for data processing
import { /* import needed modules */ } from '...';

// Write test code here`
      },
      {
        id: 'check-3',
        require: 'Handle edge cases and errors',
        test: `// TODO: Implement test for error handling
import { /* import needed modules */ } from '...';

// Write test code here`
      }
    ]
  };
}

/**
 * Generate a valid YAML spec from a feature description
 */
export async function generateYamlSpec(
  feature: string, 
  files: string[] = [], 
  isAgent: boolean = false,
  checks: string[] = []
): Promise<string> {
  try {
    // Create a slug from the feature name
    const slug = createSlug(feature);
    
    // Generate checks if none provided
    const specChecks = checks.length > 0 
      ? checks
      : [
          `Implement core functionality for ${feature}`,
          `Add proper error handling for ${feature}`,
          `Ensure ${feature} works with edge cases`
        ];
    
    // Create check objects with unique IDs and test code
    const checkObjects = specChecks.map(check => ({
      id: `check-${generateId()}`,
      require: check,
      test: generateTestCode(check, files)
    }));
    
    // Create a JSON object for the spec
    const specObject = {
      title: feature.charAt(0).toUpperCase() + feature.slice(1),
      files: files,
      checks: checkObjects
    };
    
    // Validate the spec before generating YAML
    const validation = validateSpecification(specObject);
    if (!validation.valid) {
      console.warn('Generated spec validation issues:', validation.errors);
      
      // Fix any validation issues
      if (!specObject.title) {
        specObject.title = feature || 'Untitled Feature';
      }
      
      if (!Array.isArray(specObject.files)) {
        specObject.files = [];
      }
      
      if (!Array.isArray(specObject.checks) || specObject.checks.length === 0) {
        specObject.checks = [
          {
            id: `check-${generateId()}`,
            require: `Implement ${feature || 'feature'}`,
            test: `// TODO: Implement test for ${feature || 'feature'}`
          }
        ];
      }
      
      // Ensure all checks have IDs
      specObject.checks = specObject.checks.map((check: any) => {
        if (!check.id) {
          check.id = `check-${generateId()}`;
        }
        return check;
      });
    }
    
    // Convert to YAML format using the yaml library
    const yamlContent = stringify(specObject);
    
    return yamlContent;
  } catch (error) {
    console.error('Error generating YAML spec:', error);
    throw error;
  }
}

/**
 * Generate test code for a check
 */
export function generateTestCode(check: string, files: string[]): string {
  // Get file module names without extensions
  const moduleImports = files.map(file => {
    const moduleName = path.basename(file, path.extname(file))
      .replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize for valid variable name
    return { path: file, name: moduleName };
  });
  
  // Generate imports based on files
  const imports = moduleImports.length > 0 
    ? moduleImports.map(mod => `import * as ${mod.name} from '../${mod.path}';`).join('\n')
    : '// No files specified for import';
  
  // Extract keywords from check for test focus
  const keywords = check.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 4)
    .slice(0, 5);
  
  let testFocus = '';
  if (check.toLowerCase().includes('error')) {
    testFocus = 'error handling';
  } else if (check.toLowerCase().includes('edge case')) {
    testFocus = 'edge cases';
  } else if (check.toLowerCase().includes('valid')) {
    testFocus = 'validation';
  } else {
    testFocus = 'functionality';
  }
  
  // Generate test code
  return `
// Test for: ${check}
${imports}
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test ${testFocus} for ${keywords.join(' ')} functionality
 */
export default function test() {
  try {
    // Check that required files exist
${moduleImports.map(mod => `    // Ensure ${mod.path} can be imported
    if (typeof ${mod.name} !== 'undefined') {
      console.log('✅ Successfully imported ${mod.path}');
    } else {
      throw new Error('Failed to import ${mod.path}');
    }`).join('\n\n')}
    
    // TODO: Add more specific tests for:
    // ${check}
    
    // Placeholder test (replace with actual implementation)
    if (${moduleImports.length > 0 ? `${moduleImports[0].name}` : 'true'}) {
      console.log('✅ Test passed!');
      return true;
    } else {
      throw new Error('Test condition failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error; // Re-throw to signal test failure
  }
}`;
}

/**
 * Generate a simple ID for checks
 */
export function generateId(length: number = 8): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Save a YAML spec to a file
 */
export async function saveYamlSpec(feature: string, yamlContent: string, isAgent: boolean = false): Promise<string> {
  try {
    // Determine the output directory
    const outputDir = isAgent ? AGENTS_DIR : SPECS_DIR;
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a slug for the file name
    const slug = createSlug(feature);
    
    // Full path to the spec file
    const specPath = path.join(outputDir, `${slug}.yaml`);
    
    // Write the file
    fs.writeFileSync(specPath, yamlContent, 'utf8');
    
    return specPath;
  } catch (error) {
    console.error('Error saving YAML spec:', error);
    throw error;
  }
}

/**
 * Specification types supported by CheckMate
 */
export enum SpecificationType {
  A = 'A',
  B = 'B',
  YAML = 'YAML',
  MARKDOWN = 'MARKDOWN'
}

/**
 * Type A Specification structure
 */
export interface TypeASpecification {
  type: 'A';
  name: string;
  testCases: {
    input: string;
    expectedOutput: string;
  }[];
}

/**
 * Type B Specification structure
 */
export interface TypeBSpecification {
  type: 'B';
  name: string;
  checks: {
    id: string;
    description: string;
    criteria: string[];
  }[];
  validationRules: {
    type: string;
    rule: string;
  }[];
}

/**
 * Create a new Type A specification
 */
export function createSpecification(spec: TypeASpecification): TypeASpecification {
  // Validate the specification
  if (!spec.type || spec.type !== 'A') {
    throw new Error('Invalid specification type. Must be "A"');
  }
  
  if (!spec.name) {
    throw new Error('Specification must have a name');
  }
  
  if (!spec.testCases || !Array.isArray(spec.testCases) || spec.testCases.length === 0) {
    throw new Error('Specification must have at least one test case');
  }
  
  // Validate each test case
  for (const testCase of spec.testCases) {
    if (!testCase.input || !testCase.expectedOutput) {
      throw new Error('Each test case must have input and expectedOutput properties');
    }
  }
  
  return {
    type: 'A',
    name: spec.name,
    testCases: spec.testCases
  };
}

/**
 * Create a new Type B specification
 */
export function createTypeBSpecification(spec: TypeBSpecification): TypeBSpecification {
  // Validate the specification
  if (!spec.type || spec.type !== 'B') {
    throw new Error('Invalid specification type. Must be "B"');
  }
  
  if (!spec.name) {
    throw new Error('Specification must have a name');
  }
  
  if (!spec.checks || !Array.isArray(spec.checks) || spec.checks.length === 0) {
    throw new Error('Specification must have at least one check');
  }
  
  // Generate IDs for checks if not provided and ensure they're unique
  const checks = ensureUniqueCheckIds(spec.checks);
  
  // Ensure validation rules are properly formatted
  const validationRules = spec.validationRules || [];
  
  // Type B specifications must have at least one validation rule
  if (validationRules.length === 0) {
    validationRules.push({
      type: 'format',
      rule: 'Must follow Type B structure'
    });
  }
  
  return {
    type: 'B',
    name: spec.name,
    checks,
    validationRules
  };
}

/**
 * Save a specification to file
 */
export function saveSpecification(spec: TypeASpecification | TypeBSpecification, outputPath?: string): string {
  ensureSpecsDir();
  
  // Generate output path if not provided
  if (!outputPath) {
    const fileName = `test-specification-type-${spec.type.toLowerCase()}.json`;
    outputPath = path.join(AGENTS_DIR, fileName);
  }
  
  // Convert to JSON and save
  const specJson = JSON.stringify(spec, null, 2);
  fs.writeFileSync(outputPath, specJson, 'utf8');
  
  return outputPath;
}

/**
 * Generate a Type A test specification with AI assistance
 */
export async function generateTypeASpec(name: string, description: string): Promise<TypeASpecification> {
  try {
    // Define system prompt
    const systemPrompt = `You are a specialized test engineer creating test specifications. 
For the given feature, generate a valid Type A test specification with appropriate test cases.
Each test case should have a clear input and expected output.`;

    // Define user prompt
    const userPrompt = `Please create a Type A test specification for the following feature:
Feature: ${name}
Description: ${description}

Generate a JSON structure following this model:
{
  "type": "A",
  "name": "The feature name",
  "testCases": [
    {
      "input": "Sample input 1",
      "expectedOutput": "Expected output 1"
    },
    {
      "input": "Sample input 2",
      "expectedOutput": "Expected output 2"
    }
  ]
}

Include at least 3 diverse test cases covering different aspects of the feature.
Ensure each test case has clear input values and definite expected outputs.`;

    // Call AI model
    const response = await reason(systemPrompt, userPrompt);
    
    // Extract the JSON part from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to get valid JSON from AI response');
    }
    
    // Parse the JSON
    const spec = JSON.parse(jsonMatch[0]);
    
    // Validate and return the specification
    return createSpecification(spec);
  } catch (error) {
    console.error('Error generating Type A specification:', error);
    
    // Return a default specification if AI fails
    return {
      type: 'A',
      name,
      testCases: [
        {
          input: 'default input',
          expectedOutput: 'default output'
        },
        {
          input: 'second input',
          expectedOutput: 'second output'
        },
        {
          input: 'third input',
          expectedOutput: 'third output'
        }
      ]
    };
  }
}

/**
 * Generate a Type B test specification with AI assistance
 */
export async function generateTypeBSpec(name: string, description: string): Promise<TypeBSpecification> {
  try {
    // Define system prompt
    const systemPrompt = `You are a specialized test engineer creating check specifications. 
For the given feature, generate a valid Type B test specification with appropriate checks and validation rules.
Each check should have a clear description and specific criteria for validation.`;

    // Define user prompt
    const userPrompt = `Please create a Type B test specification for the following feature:
Feature: ${name}
Description: ${description}

Generate a JSON structure following this model:
{
  "type": "B",
  "name": "The feature name",
  "checks": [
    {
      "id": "check1",
      "description": "Check description",
      "criteria": ["Criterion 1", "Criterion 2"]
    },
    {
      "id": "check2",
      "description": "Another check",
      "criteria": ["Criterion 1", "Criterion 2"]
    }
  ],
  "validationRules": [
    {
      "type": "format",
      "rule": "Validation rule description"
    },
    {
      "type": "content",
      "rule": "Another validation rule"
    }
  ]
}

Include at least 3 checks with specific validation criteria.
Also include at least 2 validation rules specific to Type B specifications.`;

    // Call AI model
    const response = await reason(systemPrompt, userPrompt);
    
    // Extract the JSON part from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to get valid JSON from AI response');
    }
    
    // Parse the JSON
    const spec = JSON.parse(jsonMatch[0]);
    
    // Validate and return the specification
    return createTypeBSpecification(spec);
  } catch (error) {
    console.error('Error generating Type B specification:', error);
    
    // Return a default specification if AI fails
    return {
      type: 'B',
      name,
      checks: [
        {
          id: 'check1',
          description: 'First check',
          criteria: ['Criterion 1', 'Criterion 2']
        },
        {
          id: 'check2',
          description: 'Second check',
          criteria: ['Criterion 1', 'Criterion 2']
        },
        {
          id: 'check3',
          description: 'Third check',
          criteria: ['Criterion 1', 'Criterion 2']
        }
      ],
      validationRules: [
        {
          type: 'format',
          rule: 'Must follow Type B structure'
        },
        {
          type: 'content',
          rule: 'Must have specific validation rules different from other types'
        }
      ]
    };
  }
}

/**
 * Validate a specification against a schema to ensure correctness
 */
export function validateSpecification(spec: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Check if it's a valid object
  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Specification must be an object'] };
  }
  
  // Check required fields for all spec types
  if (!spec.title || typeof spec.title !== 'string') {
    errors.push('Specification must have a title field that is a string');
  }
  
  // Check schema for Type A specs
  if (spec.type === 'A') {
    if (!Array.isArray(spec.testCases)) {
      errors.push('Type A specification must have a testCases array');
    } else {
      spec.testCases.forEach((testCase: any, index: number) => {
        if (!testCase.input) {
          errors.push(`Test case ${index} is missing input field`);
        }
        if (!testCase.expectedOutput) {
          errors.push(`Test case ${index} is missing expectedOutput field`);
        }
      });
    }
  } 
  // Check schema for Type B specs
  else if (spec.type === 'B') {
    if (!Array.isArray(spec.checks)) {
      errors.push('Type B specification must have a checks array');
    } else {
      spec.checks.forEach((check: any, index: number) => {
        if (!check.id) {
          errors.push(`Check ${index} is missing id field`);
        }
        if (!check.description) {
          errors.push(`Check ${index} is missing description field`);
        }
        if (!Array.isArray(check.criteria)) {
          errors.push(`Check ${index} is missing criteria array`);
        }
      });
    }
    
    if (!Array.isArray(spec.validationRules)) {
      errors.push('Type B specification must have a validationRules array');
    }
  } 
  // Check schema for standard YAML/JSON specs
  else {
    // Validate files field
    if (!Array.isArray(spec.files)) {
      errors.push('Specification must have a files array');
    } else {
      // Check that all files are strings
      spec.files.forEach((file: any, index: number) => {
        if (typeof file !== 'string') {
          errors.push(`File at index ${index} must be a string`);
        }
      });
    }
    
    // Validate checks field
    if ((!Array.isArray(spec.checks) || spec.checks.length === 0) && 
        (!Array.isArray(spec.requirements) || spec.requirements.length === 0)) {
      errors.push('Specification must have either a checks or requirements array');
    } else {
      // Get the checks array (either direct or from requirements for backward compatibility)
      const checksArray = spec.checks || spec.requirements || [];
      
      // Check that all checks have required fields
      checksArray.forEach((check: any, index: number) => {
        if (!check.id) {
          errors.push(`Check at index ${index} is missing id field`);
        }
        if (!check.require || typeof check.require !== 'string') {
          errors.push(`Check at index ${index} is missing or has invalid 'require' field`);
        }
        if (check.test && typeof check.test !== 'string') {
          errors.push(`Check at index ${index} has invalid 'test' field (must be a string)`);
        }
      });
      
      // Check for duplicate check IDs
      const ids = new Set<string>();
      checksArray.forEach((check: any) => {
        if (check.id) {
          if (ids.has(check.id)) {
            errors.push(`Duplicate check ID: ${check.id}`);
          } else {
            ids.add(check.id);
          }
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Ensure all checks have unique IDs
 */
export function ensureUniqueCheckIds(checks: any[]): any[] {
  const usedIds = new Set<string>();
  
  return checks.map(check => {
    // If no ID is provided, or ID is already used, generate a new one
    if (!check.id || usedIds.has(check.id)) {
      check.id = crypto.randomBytes(4).toString('hex');
      // Keep generating until we get a unique ID (extremely unlikely to loop more than once)
      while (usedIds.has(check.id)) {
        check.id = crypto.randomBytes(4).toString('hex');
      }
    }
    
    // Add ID to used IDs
    usedIds.add(check.id);
    
    return check;
  });
}

// Alias for backward compatibility
export const ensureUniqueRequirementIds = ensureUniqueCheckIds; 