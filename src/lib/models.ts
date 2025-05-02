/**
 * AI Model integration for CheckMate CLI
 * Uses the Vercel AI SDK to interact with language models
 */
import OpenAI from 'openai';
import { load as loadConfig } from './config.js';
import * as fs from 'node:fs';
import * as dotenv from 'node:process';

/**
 * Initialize OpenAI client with configuration
 */
function getOpenAIClient(): OpenAI {
  const config = loadConfig();
  
  // Get the API key from config or environment variable
  let apiKey = config.openai_key;
  
  // Check if the key is an environment variable reference
  if (apiKey.startsWith('env:')) {
    const envVarName = apiKey.substring(4);
    apiKey = process.env[envVarName] || '';
  }
  
  // Validate API key
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set it in .checkmate or as OPENAI_API_KEY environment variable.');
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Call the AI model using the specified slot
 * 
 * @param slot - The model slot to use ('reason' or 'quick')
 * @param systemPrompt - System instructions for the model
 * @param userPrompt - The user's request/query
 * @returns The model's response text
 */
export async function callModel(
  slot: 'reason' | 'quick',
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = loadConfig();
  const modelName = config.models[slot];
  const client = getOpenAIClient();
  
  try {
    // Configure temperature based on slot
    // - 'reason' uses higher temperature for creative tasks
    // - 'quick' uses lower temperature for consistent evaluations
    const temperature = slot === 'quick' ? 0 : 0.2;
    
    const response = await client.chat.completions.create({
      model: modelName,
      temperature,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    
    // Extract and return the response text
    return response.choices[0].message.content?.trim() || '';
  } catch (error) {
    console.error(`Error calling ${slot} model:`, error);
    throw error;
  }
}

/**
 * Use the 'reason' model for generating thoughtful, detailed content
 * Example: Generating requirements, developing specs
 */
export async function reason(prompt: string, systemInstructions?: string): Promise<string> {
  const defaultSystemPrompt = `You are a senior toolsmith specialized in creating software specifications.
Your task is to create a detailed spec in markdown format, with clear requirements that can be checked programmatically.
Be specific, actionable, and focus on measurable outcomes.`;
  
  return callModel('reason', systemInstructions || defaultSystemPrompt, prompt);
}

/**
 * Use the 'quick' model for fast evaluations and simple decisions
 * Example: Evaluating if a requirement passes its test
 */
export async function quick(prompt: string, systemInstructions?: string): Promise<string> {
  const defaultSystemPrompt = `You are a strict test evaluator. 
Your job is to determine if the described requirement has been met based on the code and context.
Answer with just "pass" or "fail" followed by a single sentence explanation.`;
  
  return callModel('quick', systemInstructions || defaultSystemPrompt, prompt);
}

/**
 * Direct test function for validation
 */
export async function testModelIntegration(): Promise<boolean> {
  try {
    const response = await callModel(
      'quick', 
      'You are a test assistant.',
      'Reply with "TEST_SUCCESS" to confirm you are working.'
    );
    
    console.log('Model response:', response);
    return response.includes('TEST_SUCCESS');
  } catch (error) {
    console.error('Model integration test failed:', error);
    return false;
  }
} 