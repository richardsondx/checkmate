/**
 * AI Client for CheckMate CLI
 * Specialized functions for code summarization and implementation analysis
 */

import { reason, quick } from './models.js';

/**
 * Summarize code using the AI model
 */
export async function aiSummarize(prompt: string): Promise<string> {
  const systemInstructions = `
You are a code-to-pseudocode analyzer specializing in creating concise summaries of code.
Your task is to analyze source code and extract the key functional steps as numbered bullets.
Focus only on the executable flow and important logic.
Use present imperative verbs (validate, check, create, etc.)
Use exactly the format requested in the prompt.
Be precise and specific about what the code does.`;

  return reason(prompt, systemInstructions);
}

/**
 * Compare two text blocks semantically for similarity
 */
export async function aiCompare(textA: string, textB: string): Promise<number> {
  const prompt = `
Compare these two descriptions semantically and determine their similarity from 0-1:

Text A: "${textA}"
Text B: "${textB}"

Respond with a single number between 0 and 1, where:
- 1.0 means identical in meaning
- 0.8-0.9 means very similar with minor variations
- 0.5-0.7 means generally similar but with notable differences
- 0.3-0.4 means somewhat related but different intent
- 0.0-0.2 means completely different or unrelated

Similarity score (0-1):`;

  const systemInstructions = `
You are a semantic comparison expert who analyzes text for functional similarity.
Your task is to return ONLY a similarity score as a decimal between 0 and 1.
You should focus on the functional intent, not exact wording.`;

  // Get the similarity score as a string
  const response = await quick(prompt, systemInstructions);
  
  // Extract the number from the response
  const match = response.match(/([0-9](\.[0-9]+)?)/);
  if (match && match[0]) {
    return parseFloat(match[0]);
  }
  
  // Default to a moderate similarity if parsing fails
  return 0.5;
}

/**
 * Generate a semantic diff between spec requirements and implementation
 */
export async function aiGenerateDiff(
  specRequirements: string[],
  implementationBullets: string[]
): Promise<Array<{ specIndex: number, implIndex: number, similarity: number }>> {
  // For smaller inputs, we'll compare each item directly
  const diffs: Array<{ specIndex: number, implIndex: number, similarity: number }> = [];
  
  // Compare each spec requirement with each implementation bullet
  for (let i = 0; i < specRequirements.length; i++) {
    for (let j = 0; j < implementationBullets.length; j++) {
      const similarity = await aiCompare(specRequirements[i], implementationBullets[j]);
      diffs.push({ specIndex: i, implIndex: j, similarity });
    }
  }
  
  return diffs;
}

/**
 * Extract key concepts from a text
 */
export async function aiExtractConcepts(text: string): Promise<string[]> {
  const prompt = `
Extract the 3-5 key concepts from this text, focusing on actions, verbs, and nouns:

${text}

List each concept as a single word or short phrase, one per line.`;

  const systemInstructions = `
You are a semantic analyzer who extracts key concepts from text.
Your task is to identify and list the most important 3-5 actions, verbs, and nouns.
Respond with ONLY a list of key concepts, one per line, without explanations or commentary.`;

  const response = await quick(prompt, systemInstructions);
  
  // Split response into lines and filter empty ones
  return response
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
} 