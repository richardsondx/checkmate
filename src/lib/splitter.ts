/**
 * Feature splitter for CheckMate CLI
 * Takes a natural language sentence and splits it into distinct feature stubs
 */
import { reason } from './models.js';
import { createSlug } from './specs.js';

/**
 * Feature stub interface representing a single feature
 */
export interface FeatureStub {
  title: string;
  slug: string;
  description: string;
}

/**
 * Split a natural language sentence into distinct feature stubs
 */
export async function splitFeature(sentence: string): Promise<FeatureStub[]> {
  // System prompt to guide the reasoning model
  const systemPrompt = `You are an analyst specialized in breaking down complex requirements into clear, distinct features.
When given a sentence that may describe multiple features, your job is to split it into separate atomic features.
Return a JSON array where each object represents a distinct feature with the properties:
- title: a clear, concise name for the feature (3-8 words)
- description: a detailed explanation of what this specific feature entails (1-3 sentences)

IMPORTANT: Each feature should be minimal and standalone. Do not overlap functionality between features.
If the sentence describes just one feature, return an array with a single object.
Return ONLY valid JSON that can be parsed with JSON.parse().`;

  // User prompt with the sentence to split
  const userPrompt = `Return JSON array of distinct minimal features expressed in this sentence: "${sentence}"`;

  try {
    // Call the reasoning model to split the features
    const result = await reason(userPrompt, systemPrompt);
    
    // Parse the JSON response
    let parsedFeatures;
    try {
      parsedFeatures = JSON.parse(result);
    } catch (error) {
      console.error('Error parsing model response as JSON:', error);
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = result.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                       result.match(/(\[[\s\S]*?\])/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsedFeatures = JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.error('Failed to extract JSON from response:', innerError);
          throw new Error('Could not parse model response as JSON');
        }
      } else {
        throw new Error('Model did not return valid JSON');
      }
    }
    
    // Validate and transform the parsed features
    if (!Array.isArray(parsedFeatures)) {
      throw new Error('Model did not return an array of features');
    }
    
    // Create slugs and ensure all properties exist
    return parsedFeatures.map((feature: any) => ({
      title: feature.title || 'Untitled Feature',
      description: feature.description || feature.title || 'No description provided',
      slug: feature.slug || createSlug(feature.title || 'untitled-feature')
    }));
  } catch (error) {
    console.error('Error in splitFeature:', error);
    // Fallback: treat the entire sentence as one feature
    return [{
      title: sentence,
      description: sentence,
      slug: createSlug(sentence)
    }];
  }
} 