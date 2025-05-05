/**
 * Code Analyzer for CheckMate
 * Analyzes repository context to identify potential features for spec generation
 */
import { createLanguageModel, LanguageModel } from './modelWrapper.js';
import { SpecDraft } from '../commands/draft.js';
import { load as loadConfig } from './config.js';
import { createSlug } from './specs.js';

/**
 * Analyze codebase to identify potential features and generate draft specs
 * @param context - The repository context (files and their content)
 * @returns Array of spec drafts for potential features
 */
export async function analyzeCodebase(context: Record<string, string>): Promise<SpecDraft[]> {
  const config = loadConfig();
  const model = createLanguageModel(config.models?.reason || 'gpt-4o');
  
  // Group files by domain/functionality
  const fileGroups = await groupFilesByDomain(context, model);
  
  // For each file group, generate a draft spec
  const drafts: SpecDraft[] = [];
  
  for (const group of fileGroups) {
    const draft = await generateDraftFromGroup(group, context, model);
    if (draft) {
      drafts.push(draft);
    }
  }
  
  return drafts;
}

/**
 * Group files by domain/functionality
 * @param context - The repository context
 * @param model - The language model to use
 * @returns Array of file groups with domain labels
 */
async function groupFilesByDomain(
  context: Record<string, string>, 
  model: LanguageModel
): Promise<{ domain: string; files: string[] }[]> {
  const files = Object.keys(context);
  
  // Skip if there are no files
  if (files.length === 0) {
    return [];
  }
  
  // Prepare prompt for the model
  const prompt = `
You are analyzing a codebase to group files by domain/functionality.
I'll provide a list of files, and I need you to group them into logical domains.

Files:
${files.join('\n')}

Group these files by domain or functionality. For each group:
1. Provide a short, descriptive name for the domain (e.g., "Authentication", "User Profile", "API Endpoints")
2. List the files that belong to this domain
3. Each file should appear in exactly one group

Return your answer as a JSON array with this structure:
[
  { 
    "domain": "Domain Name", 
    "files": ["file1.ts", "file2.ts"] 
  }
]

Be precise and thorough in your analysis.
`;

  // Call the model to get the grouped files
  const response = await model.complete(prompt, {
    temperature: 0.3,
    max_tokens: 2000,
  });
  
  try {
    // Extract and parse the JSON from the model's response
    const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from model response');
    }
    
    const jsonStr = jsonMatch[0];
    const groups = JSON.parse(jsonStr);
    
    return groups;
  } catch (error) {
    console.error('Error parsing model response:', error);
    // Fallback: Create a single group with all files
    return [{ domain: 'Main Application', files }];
  }
}

/**
 * Generate a draft spec from a file group
 * @param group - The file group to generate a draft for
 * @param context - The repository context
 * @param model - The language model to use
 * @returns A draft spec or null if no draft could be generated
 */
async function generateDraftFromGroup(
  group: { domain: string; files: string[] },
  context: Record<string, string>,
  model: LanguageModel
): Promise<SpecDraft | null> {
  // Skip if there are no files in the group
  if (group.files.length === 0) {
    return null;
  }
  
  // Get the content of each file in the group
  const fileContents: string[] = [];
  for (const file of group.files) {
    if (context[file]) {
      fileContents.push(`File: ${file}\n${context[file].slice(0, 2000)}${context[file].length > 2000 ? '\n... (truncated)' : ''}`);
    }
  }
  
  // Skip if there are no file contents
  if (fileContents.length === 0) {
    return null;
  }
  
  // Prepare prompt for the model
  const prompt = `
You are analyzing a group of related files to identify a feature for testing.
The domain for these files is: "${group.domain}"

Here are the file contents:

${fileContents.join('\n\n')}

Based on these files, create a feature spec by:
1. Providing a descriptive title for the feature
2. Creating a list of specific requirements/checks for this feature
3. Include only the most important checks (3-5 items)

Return your answer as a JSON object with this structure:
{
  "title": "Feature Title",
  "checks": [
    "First requirement",
    "Second requirement",
    "Third requirement"
  ]
}

Ensure each check is specific, testable, and focuses on user-facing functionality.
`;

  // Call the model to get the feature spec
  const response = await model.complete(prompt, {
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  try {
    // Extract and parse the JSON from the model's response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from model response');
    }
    
    const jsonStr = jsonMatch[0];
    const feature = JSON.parse(jsonStr);
    
    // Create a draft spec from the feature
    const title = feature.title || group.domain;
    const slug = createSlug(title);
    const checks = feature.checks || [];
    
    return {
      slug,
      title,
      files: group.files,
      checks,
      meta: {
        files_auto: true,
        domain: group.domain,
        file_hashes: group.files.reduce((acc: Record<string, string>, file: string) => {
          // Generate a simple hash from the first 100 chars of the file content
          const content = context[file] || '';
          const hash = Buffer.from(content.slice(0, 100)).toString('base64');
          acc[file] = hash;
          return acc;
        }, {})
      }
    };
  } catch (error) {
    console.error('Error parsing model response:', error);
    return null;
  }
} 