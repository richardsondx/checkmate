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

// Directory where specs are stored
const SPECS_DIR = 'checkmate/specs';

// Ensure the specs directory exists
function ensureSpecsDir(): void {
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
}

/**
 * Result of generating a specification
 */
export interface SpecResult {
  path: string;
  content: string;
  slug: string;
  needsMoreContext: boolean;
}

/**
 * Generate a rich specification from a feature and context
 */
export async function authorSpec(
  feature: FeatureStub,
  contextFiles: ContextFile[],
  additionalNotes?: string
): Promise<SpecResult> {
  // Ensure specs directory exists
  ensureSpecsDir();
  
  // Prepare the files list with relevance information
  const filesWithReasons = contextFiles
    .map(file => `- ${file.path}${file.reason ? ` (${file.reason})` : ''}`)
    .join('\n');
  
  // Prepare additional notes section if provided
  const notesSection = additionalNotes ? 
    `\n\nAdditional context/requirements:\n${additionalNotes}` : '';
  
  // System prompt to guide the reasoning model
  const systemPrompt = `You are a senior software architect specialized in creating detailed, testable specifications.
Your task is to create a comprehensive spec in markdown format based on a feature description and relevant code files.

The specification MUST include:
1. A clear title based on the feature name
2. A YAML front matter with metadata 
3. A curated list of the MOST relevant files (only include files that would need to be modified or are critical for understanding)
4. A list of specific, testable requirements in a checklist format with checkboxes "[ ]"

Follow these guidelines:
- Each step must be concrete, testable, and specific (no generic CRUD steps)
- Focus on verification: how would an AI agent know this step is complete?
- Keep the steps focused and atomic
- If more context is needed, indicate this in your response

Your output format MUST be valid markdown with this structure:

\`\`\`md
# Feature: {title}

files:
{file list, one per line with "- " prefix}

steps:
{numbered or bulleted steps, each with "- [ ] " prefix}
\`\`\`

If the file list provided contains too many files, select only the most relevant ones (max 20).`;

  // User prompt with the feature and context
  const userPrompt = `Create a detailed, testable specification for this feature:

Feature name: ${feature.title}
Description: ${feature.description}${notesSection}

Here are potentially relevant files (ranked by relevance):
${filesWithReasons}

Generate a specification that:
1. Lists only the most relevant files from above (no more than 20)
2. Provides 5-10 concrete, testable steps that would verify this feature works
3. Indicates if more context is needed to fully specify this feature

Reply ONLY with the markdown specification.`;

  try {
    // Call the reasoning model to author the spec
    const content = await reason(userPrompt, systemPrompt);
    
    // Check if the content suggests need for more context
    const needsMoreContext = content.toLowerCase().includes('more context') || 
                            content.toLowerCase().includes('additional context');
    
    // Save the spec to a file
    const filePath = path.join(SPECS_DIR, `${feature.slug}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    
    return {
      path: filePath,
      content,
      slug: feature.slug,
      needsMoreContext
    };
  } catch (error) {
    console.error('Error generating spec with AI:', error);
    
    // Create a fallback spec
    const fallbackContent = createFallbackSpec(feature, contextFiles);
    const filePath = path.join(SPECS_DIR, `${feature.slug}.md`);
    fs.writeFileSync(filePath, fallbackContent, 'utf8');
    
    return {
      path: filePath,
      content: fallbackContent,
      slug: feature.slug,
      needsMoreContext: true
    };
  }
}

/**
 * Create a fallback spec if AI generation fails
 */
function createFallbackSpec(feature: FeatureStub, contextFiles: ContextFile[]): string {
  // Select top files (max 10)
  const topFiles = contextFiles.slice(0, 10).map(file => file.path);
  const filesList = topFiles.map(file => `- ${file}`).join('\n');
  
  // Create a basic template
  return `# Feature: ${feature.title}

files:
${filesList}

steps:
- [ ] Implement basic structure for ${feature.title}
- [ ] Validate inputs from user
- [ ] Process data correctly
- [ ] Handle edge cases and errors
- [ ] Return appropriate response
- [ ] Add tests for this feature

Note: This is a fallback specification. Please regenerate with AI for better results.
`;
} 