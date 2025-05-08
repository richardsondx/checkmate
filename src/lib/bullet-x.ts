/**
 * Unified action bullet extraction library for CheckMate
 * 
 * This module provides consistent bullet extraction across warmup and audit commands
 * to ensure that the AI generates and validates the same types of action bullets.
 */
import { createLanguageModel } from './modelWrapper.js';
import { load as loadConfig } from './config.js';
import * as crypto from 'crypto';

// Format constants
const VERB_OBJECT_FORMAT = "verb + object";
const IMPERATIVE_MOOD = "imperative present tense";
const MAX_BULLET_LENGTH = 5; // words
const MAX_CODE_TOKENS = 50000; // Approximate max tokens to send to model
const MAX_CHARS_PER_FILE = 10000; // Limit chars per file to avoid token limit

/**
 * Extract action bullets from code content
 * @param fileContents - Map of filenames to their content
 * @param options - Configuration options
 * @returns Array of normalized action bullets
 */
export async function extractActionBullets(
  fileContents: Record<string, string>,
  options: {
    limit?: number; 
    filter?: string[];
    checkExisting?: string[];
    temperature?: number;
  } = {}
): Promise<string[]> {
  // Default options
  const limit = options.limit || 15;
  const temperature = options.temperature || 0.2;
  const stopVerbs = options.filter || ['return', 'print', 'log', 'console', 'throw'];
  
  // Process files to avoid token limit issues
  const processedFiles: Record<string, string> = {};
  let totalChars = 0;
  
  // First, truncate each file content to avoid excessive tokens
  for (const [file, content] of Object.entries(fileContents)) {
    // Take only the first MAX_CHARS_PER_FILE characters from each file
    const truncatedContent = content.length > MAX_CHARS_PER_FILE 
      ? content.substring(0, MAX_CHARS_PER_FILE) + '\n// ... [file truncated to avoid token limit] ...'
      : content;
    
    processedFiles[file] = truncatedContent;
    totalChars += truncatedContent.length;
    
    // If we've already collected enough text, stop adding more files
    if (totalChars > MAX_CODE_TOKENS * 3) { // Rough char-to-token ratio estimate
      console.log(`⚠️ Limiting analysis to ${Object.keys(processedFiles).length} files (token limit)`);
      break;
    }
  }
  
  // Combine file contents into a single code snippet for analysis
  const codeSnippet = Object.entries(processedFiles)
    .map(([file, content]) => `// File: ${file}\n${content}`)
    .join('\n\n');
  
  // Get the model to use
  const config = loadConfig();
  const model = createLanguageModel(config.models?.reason || 'gpt-4o');
  
  // Create the system prompt
  const systemPrompt = `You are a senior code analyst specializing in identifying key actions performed by code.
Extract action bullets from code by following these strict rules:
1. Use exactly the format: <verb> <object> [<optional qualifier>]
2. Use lowercase ${IMPERATIVE_MOOD} verbs (e.g., validate, fetch, create)
3. Keep bullets concise (${MAX_BULLET_LENGTH} words or fewer)
4. No conjunctions, avoid technical variable names
5. Focus on WHAT the code does, not HOW it does it
6. Prioritize functional behaviors over implementation details`;

  // Create the combined prompt
  const prompt = `${systemPrompt}

Extract at most ${limit} ACTION BULLETS that describe what this code DOES.

Follow these rules exactly:
• Format: ${VERB_OBJECT_FORMAT} (qualifier)  
• Use ${IMPERATIVE_MOOD}, lowercase
• Each bullet ≤ ${MAX_BULLET_LENGTH} words
• No conjunctions, no variable names
• Filter out trivial actions like ${stopVerbs.join(', ')} unless they're primary functionality

CODE TO ANALYZE:
${codeSnippet}

Respond with a JSON array of strings containing ONLY the action bullets. Example:
["validate user credentials", "generate auth token", "store user data"]
`;

  // Call the AI to generate the bullets
  try {
    const response = await model.complete(prompt, {
      temperature,
      max_tokens: 1500,
    });
  
    // Extract the JSON array from the response
    let rawBullets: string[] = [];
    try {
      // Find a JSON array in the response
      const match = response.match(/\[\s*".*"\s*\]/s);
      if (match) {
        rawBullets = JSON.parse(match[0]);
      } else {
        // Fallback to line-by-line extraction for non-JSON responses
        rawBullets = response.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('"') && line.endsWith('"'))
          .map(line => line.replace(/^"|"$/g, '').trim())
          .filter(Boolean);
      }
    } catch (error) {
      console.error('Error parsing bullet response:', error);
      
      // Fallback to simpler parsing
      rawBullets = response.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('[') && !line.startsWith(']'))
        .map(line => line.replace(/^-\s*/, '').replace(/^"|"$/g, '').replace(/,$/, '').trim())
        .filter(Boolean);
    }
    
    // Normalize and deduplicate the bullets
    const normalizedBullets = normalizeBullets(rawBullets);
    
    // If checkExisting is provided, filter out bullets that are already covered
    if (options.checkExisting && options.checkExisting.length > 0) {
      return normalizedBullets.filter(bullet => 
        !options.checkExisting!.some(existing => 
          isSimilarBullet(bullet, existing)
        )
      );
    }
    
    return normalizedBullets;
  } catch (error) {
    console.error('Error calling model for bullet extraction:', error);
    // Return some default bullets as fallback if model fails
    return [
      "handle user input",
      "process data",
      "render components",
      "manage state",
      "communicate with api"
    ];
  }
}

/**
 * Normalize bullets to ensure consistent format and remove duplicates
 */
function normalizeBullets(bullets: string[]): string[] {
  // Normalize each bullet
  const normalized = bullets.map(bullet => {
    // Remove any bullet markers, quotes, etc.
    let clean = bullet
      .replace(/^[-*•]\s*/, '') // Remove bullet markers
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .replace(/[.,;:!?]$/g, '') // Remove trailing punctuation
      .toLowerCase()             // Convert to lowercase
      .trim();
    
    // Ensure bullet starts with a verb in imperative form
    // This is a simplistic approach - a real implementation might use NLP
    if (!startsWithVerb(clean)) {
      // Try to convert to imperative if possible
      if (clean.startsWith('validates')) clean = clean.replace('validates', 'validate');
      else if (clean.startsWith('handles')) clean = clean.replace('handles', 'handle');
      else if (clean.startsWith('creates')) clean = clean.replace('creates', 'create');
      else if (clean.startsWith('processes')) clean = clean.replace('processes', 'process');
      else if (clean.startsWith('generates')) clean = clean.replace('generates', 'generate');
      else if (clean.startsWith('extracts')) clean = clean.replace('extracts', 'extract');
      else if (clean.startsWith('parses')) clean = clean.replace('parses', 'parse');
      else if (clean.startsWith('stores')) clean = clean.replace('stores', 'store');
      else if (clean.startsWith('sends')) clean = clean.replace('sends', 'send');
      else if (clean.startsWith('returns')) clean = clean.replace('returns', 'return');
    }
    
    return clean;
  });
  
  // Remove duplicates
  return Array.from(new Set(normalized));
}

/**
 * Check if a string starts with a common verb in imperative form
 */
function startsWithVerb(text: string): boolean {
  const commonVerbs = [
    'validate', 'check', 'verify', 'ensure', 
    'create', 'generate', 'build', 
    'update', 'modify', 'change',
    'delete', 'remove', 'clear',
    'fetch', 'retrieve', 'get', 'load',
    'save', 'store', 'persist',
    'parse', 'process', 'handle', 'manage',
    'display', 'show', 'render',
    'send', 'transmit', 'dispatch',
    'receive', 'accept', 'collect',
    'analyze', 'examine', 'inspect',
    'filter', 'sort', 'organize',
    'compare', 'match', 'find',
    'extract', 'isolate', 'separate',
    'combine', 'merge', 'join',
    'initialize', 'setup', 'configure',
    'calculate', 'compute', 'determine',
    'convert', 'transform', 'normalize',
    'enable', 'disable', 'toggle',
    'start', 'begin', 'launch',
    'stop', 'end', 'terminate',
    'scan', 'search', 'look'
  ];
  
  return commonVerbs.some(verb => text.startsWith(verb + ' '));
}

/**
 * Determine if two bullets are semantically similar
 * For now, this is a simple string matching algorithm,
 * but could be enhanced with embeddings in the future
 */
function isSimilarBullet(bullet1: string, bullet2: string): boolean {
  // Exact match
  if (bullet1 === bullet2) return true;
  
  // Normalize for comparison
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const b1 = normalize(bullet1);
  const b2 = normalize(bullet2);
  
  // Simple word overlap score
  const words1 = new Set(b1.split(' '));
  const words2 = new Set(b2.split(' '));
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const similarity = intersection.size / union.size;
  
  return similarity > 0.5;
}

/**
 * Create a stable hash of action bullets for versioning/comparison
 * @param bullets - Array of action bullets
 * @returns Hash string representing the bullet set
 */
export function createBulletHash(bullets: string[]): string {
  // Sort bullets for consistent hashing
  const sortedBullets = [...bullets].sort();
  const bulletText = sortedBullets.join('\n');
  
  // Create a hash
  return crypto.createHash('sha256').update(bulletText).digest('hex').substring(0, 12);
}

/**
 * Compare two sets of bullets and find differences
 * @param specBullets - Bullets from the spec
 * @param implBullets - Bullets from the implementation
 * @returns Object with matches, missingInCode, and missingInSpec
 */
export function compareBullets(specBullets: string[], implBullets: string[]): {
  matches: string[];
  missingInCode: string[];
  missingInSpec: string[];
} {
  const matches: string[] = [];
  const missingInCode: string[] = [];
  const missingInSpec: string[] = [];
  
  // Check each spec bullet against implementation bullets
  for (const specBullet of specBullets) {
    const match = implBullets.find(implBullet => 
      isSimilarBullet(specBullet, implBullet));
    
    if (match) {
      matches.push(specBullet);
    } else {
      missingInCode.push(specBullet);
    }
  }
  
  // Check each implementation bullet against spec bullets
  for (const implBullet of implBullets) {
    const match = specBullets.find(specBullet => 
      isSimilarBullet(implBullet, specBullet));
    
    if (!match) {
      missingInSpec.push(implBullet);
    }
  }
  
  return { matches, missingInCode, missingInSpec };
} 