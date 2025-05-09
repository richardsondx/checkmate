/**
 * OpenAI utilities for CheckMate CLI
 */
import OpenAI from 'openai';
import { getOpenAIClient } from './models.js';

/**
 * Get OpenAI client
 */
export async function getOpenAI(): Promise<OpenAI> {
  return getOpenAIClient();
}

/**
 * Type definition for spec matches returned from OpenAI
 */
export interface SpecMatch {
  path: string;
  relevance: number;
  title: string;
  reason: string;
} 