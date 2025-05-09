/**
 * AI Model integration for CheckMate CLI
 * Supports both OpenAI and Anthropic models
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { load as loadConfig } from './config.js';
import * as fs from 'node:fs';
import * as dotenv from 'node:process';
import * as telemetry from './telemetry.js';

/**
 * Initialize OpenAI client with configuration
 */
export function getOpenAIClient(): OpenAI {
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
 * Initialize Anthropic client with configuration
 */
function getAnthropicClient(): Anthropic {
  const config = loadConfig();
  
  // Get the API key from config or environment variable
  let apiKey = config.anthropic_key;
  
  // Check if the key is an environment variable reference
  if (apiKey.startsWith('env:')) {
    const envVarName = apiKey.substring(4);
    apiKey = process.env[envVarName] || '';
  }
  
  // Validate API key
  if (!apiKey) {
    throw new Error('Anthropic API key not found. Please set it in .checkmate or as ANTHROPIC_API_KEY environment variable.');
  }
  
  return new Anthropic({ apiKey });
}

/**
 * Check if the model is an Anthropic model
 */
function isAnthropicModel(modelName: string): boolean {
  return modelName.toLowerCase().includes('claude');
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
  // Check if we're in a test environment
  if (process.env.TEST_ENV === 'true') {
    return mockCallModel(slot, systemPrompt, userPrompt);
  }
  
  const config = loadConfig();
  const modelName = config.models[slot];
  
  try {
    // Configure temperature based on slot
    // - 'reason' uses higher temperature for creative tasks
    // - 'quick' uses lower temperature for consistent evaluations
    const temperature = slot === 'quick' ? 0 : 0.2;
    
    // Record start time for telemetry
    const startTime = Date.now();
    let result: string;
    let usage: { prompt: number; completion: number; estimated: boolean };
    
    // Use the appropriate API based on the model
    if (isAnthropicModel(modelName)) {
      const response = await callAnthropicModel(modelName, systemPrompt, userPrompt, temperature);
      result = response.text;
      usage = telemetry.pickUsage(response.raw);
    } else {
      const response = await callOpenAIModel(modelName, systemPrompt, userPrompt, temperature);
      result = response.text;
      usage = telemetry.pickUsage(response.raw);
    }
    
    // Record telemetry
    telemetry.record({
      provider: isAnthropicModel(modelName) ? 'anthropic' : 'openai',
      model: modelName,
      tokensIn: usage.prompt,
      tokensOut: usage.completion,
      ms: Date.now() - startTime,
      estimated: usage.estimated
    });
    
    return result;
  } catch (error) {
    console.error(`Error calling ${slot} model:`, error);
    throw error;
  }
}

/**
 * Mock implementation for tests to avoid actual API calls
 */
function mockCallModel(slot: 'reason' | 'quick', systemPrompt: string, userPrompt: string): string {
  console.log(`[TEST] Mock model call to ${slot} with prompt: ${userPrompt.substring(0, 50)}...`);
  
  if (slot === 'quick') {
    return "pass This is a mock response for testing purposes";
  } else {
    // For reason model, return a JSON structure
    return JSON.stringify({
      suggestion: "This is a mock suggestion for testing",
      next_action: "fix-code",
      reason: "This is a mock reason for testing"
    });
  }
}

/**
 * Call the OpenAI API with the specified parameters
 */
async function callOpenAIModel(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<{ text: string; raw: any }> {
  const client = getOpenAIClient();
  
  // For newer models like gpt-4o, use max_completion_tokens instead of max_tokens
  const params: any = {
    model: modelName,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };
  
  // Choose the right parameter based on the model name
  // GPT-4o and newer models require max_completion_tokens
  if (modelName.includes('gpt-4o') || modelName.includes('o3')) {
    params.max_completion_tokens = 4096;
  } else {
    params.max_tokens = 4096;
  }
  
  const response = await client.chat.completions.create(params);
  
  // Extract the response text
  const text = response.choices[0].message.content?.trim() || '';
  
  return { text, raw: response };
}

/**
 * Call the Anthropic API with the specified parameters
 */
async function callAnthropicModel(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<{ text: string; raw: any }> {
  const client = getAnthropicClient();
  
  const response = await client.messages.create({
    model: modelName,
    max_tokens: 4096,
    temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });
  
  // Extract the response text
  // Check the content type before accessing the text property
  if (response.content && response.content.length > 0) {
    const contentBlock = response.content[0];
    if (contentBlock.type === 'text') {
      return { text: contentBlock.text.trim(), raw: response };
    }
  }
  
  throw new Error('Unexpected response format from Anthropic API');
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
    // If in test environment, return success without actual API calls
    if (process.env.TEST_ENV === 'true') {
      console.log('Model response: TEST_SUCCESS (mock)');
      return true;
    }
    
    const response = await callModel('quick', 'You are a test assistant.', 'Reply with "TEST_SUCCESS" to confirm you are working.');
    console.log('Model response:', response);
    return response.includes('TEST_SUCCESS');
  } catch (error) {
    console.error('Model integration test failed:', error);
    return false;
  }
} 