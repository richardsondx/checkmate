/**
 * Text embeddings for CheckMate
 * Provides functions to create and compare text embeddings
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as loadConfig } from './config.js';
import OpenAI from 'openai';

// Cache directory for embeddings
const CACHE_DIR = path.join('checkmate', 'cache', 'embeddings');

/**
 * Create an embedding for a text string
 */
export async function createEmbedding(text: string): Promise<number[] | null> {
  try {
    const config = loadConfig();
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: config.openai_key || process.env.OPENAI_API_KEY
    });
    
    // Get embedding from OpenAI
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000) // Limit to first 8000 chars to stay within token limit
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Load embeddings from cache file
 */
export function loadCachedEmbeddings(): Record<string, number[]> {
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      return {};
    }
    
    const cachePath = path.join(CACHE_DIR, 'embeddings.json');
    
    if (!fs.existsSync(cachePath)) {
      return {};
    }
    
    const cacheContent = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(cacheContent);
  } catch (error) {
    console.error('Error loading cached embeddings:', error);
    return {};
  }
}

/**
 * Save embeddings to cache file
 */
export function saveCachedEmbeddings(cache: Record<string, number[]>): void {
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    const cachePath = path.join(CACHE_DIR, 'embeddings.json');
    fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
  } catch (error) {
    console.error('Error saving cached embeddings:', error);
  }
} 