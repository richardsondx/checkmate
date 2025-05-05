/**
 * Model Wrapper for CheckMate
 * Simplifies the model interface for code analysis
 */
import { reason, quick } from './models.js';

/**
 * Language model interface for the analyzer
 */
export interface LanguageModel {
  complete(prompt: string, options?: {
    temperature?: number;
    max_tokens?: number;
  }): Promise<string>;
}

/**
 * Create a language model with a simplified interface
 * @param modelName The name of the model to use
 * @returns A language model with a simple complete() method
 */
export function createLanguageModel(modelName: string): LanguageModel {
  return {
    complete: async (prompt: string, options = {}) => {
      // Use the appropriate model based on temperature
      // Higher temperature (>0.3) uses the reason model, otherwise the quick model
      const temperature = options.temperature || 0;
      
      // Prepare the system instructions
      const systemInstructions = `You are a code analyzer specialized in understanding software patterns and features.
Your task is to analyze repository content and provide thoughtful, structured responses.
Always respond with clean JSON when asked for specific formats.`;
      
      if (temperature > 0.3) {
        return reason(prompt, systemInstructions);
      } else {
        return quick(prompt, systemInstructions);
      }
    }
  };
} 