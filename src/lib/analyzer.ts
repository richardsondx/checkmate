/**
 * Code Analyzer for CheckMate
 * Analyzes repository context to identify potential features for spec generation
 */
import { createLanguageModel, LanguageModel } from './modelWrapper.js';
import { SpecDraft } from '../commands/draft.js';
import { load as loadConfig } from './config.js';
import { createSlug } from './specs.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Directory where patterns are cached between audit and warmup
const CACHE_DIR = 'checkmate/cache';
const WARMUP_PATTERNS_FILE = path.join(CACHE_DIR, 'warmup-patterns.json');

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
 * Load cached implementation patterns from audit runs
 * This helps align warmup-generated specs with what audit expects
 */
function loadCachedPatterns(): Record<string, string[]> {
  if (fs.existsSync(WARMUP_PATTERNS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WARMUP_PATTERNS_FILE, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not read warmup patterns cache: ${error}`);
    }
  }
  return {};
}

/**
 * Save implementation patterns to cache for use in future warmup runs
 * @param slug - The slug/identifier for the spec
 * @param patterns - Array of action bullet patterns found in implementation
 */
export function saveWarmupPatterns(slug: string, patterns: string[]): void {
  // Ensure the cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  // Load existing patterns
  const existingPatterns = loadCachedPatterns();
  
  // Add or update the patterns for this slug
  existingPatterns[slug] = patterns;
  
  // Write back to cache file
  try {
    fs.writeFileSync(
      WARMUP_PATTERNS_FILE, 
      JSON.stringify(existingPatterns, null, 2), 
      'utf8'
    );
  } catch (error) {
    console.warn(`Warning: Could not save warmup patterns cache: ${error}`);
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

  // Generate a slug for this domain to check against cached patterns
  const slug = createSlug(group.domain);
  
  // Load cached implementation patterns from audit runs
  const cachedPatterns = loadCachedPatterns();
  
  // Check if we have cached patterns for this domain or similar domains
  let knownPatterns: string[] = [];
  
  // Try to find exact match first
  if (cachedPatterns[slug]) {
    knownPatterns = cachedPatterns[slug];
  } else {
    // Look for similar domains
    for (const cachedDomain in cachedPatterns) {
      if (
        cachedDomain.includes(slug) || 
        slug.includes(cachedDomain) ||
        (group.domain.toLowerCase().includes('mcp') && cachedDomain.includes('mcp')) ||
        (group.domain.toLowerCase().includes('server') && cachedDomain.includes('server'))
      ) {
        knownPatterns = cachedPatterns[cachedDomain];
        break;
      }
    }
  }
  
  // Add hints about known patterns to the prompt if we have them
  const knownPatternsHint = knownPatterns.length > 0 
    ? `\nImportantly, analysis of this codebase has identified these specific implementations that should be included in your checks:
${knownPatterns.map(pattern => `- ${pattern}`).join('\n')}`
    : '';
  
  // Define stoplist for common verbs to filter out (same as in audit)
  const stopVerbs = ['return', 'print', 'log', 'console'];
  
  // Prepare prompt using the same format as in audit
  const prompt = `
Extract the key actions performed by this code as a list of imperative action bullets.
Each bullet must follow the format: "verb + object" (e.g., "validate credentials", "hash password").

Guidelines:
- Use simple present tense imperative verbs (e.g., "create", "fetch", "validate")
- Each bullet must be a single action (do not combine multiple actions)
- Focus on functional behavior, not implementation details
- Filter out trivial actions like ${stopVerbs.join(', ')} unless they're primary functionality
- Be specific about what the code actually does

The domain for these files is: "${group.domain}"

Here are the file contents:

${fileContents.join('\n\n')}
${knownPatternsHint}

Based on these files:
1. Provide a descriptive title for the feature
2. Extract 4-7 SPECIFIC action bullets that accurately describe what the code ACTUALLY implements
3. Each bullet must reference actual code functionality in verb+object format

For example:
- "validate user credentials"
- "generate authentication token"
- "store user data in database"

Return your answer as a JSON object with this structure:
{
  "title": "Feature Title",
  "checks": [
    "First specific action bullet",
    "Second specific action bullet",
    "Third specific action bullet"
  ]
}

IMPORTANT: Every check MUST use the verb+object format and refer to specific functionality in the code.
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