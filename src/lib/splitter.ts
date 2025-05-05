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
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * LLM Response structure
 */
interface LlmClusteringResponse {
  features: {
    title: string;
    description: string;
    confidence?: 'high' | 'medium' | 'low';
    slug?: string;
  }[];
}

/**
 * Split a natural language sentence into distinct feature stubs
 * Uses a two-stage approach:
 * 1. LLM-based clustering for semantic understanding
 * 2. Heuristic sentence analysis to catch additional splits
 */
export async function splitFeature(sentence: string): Promise<FeatureStub[]> {
  // Stage A: LLM Clustering
  const llmClusters = await llmClustering(sentence);
  
  // Stage B: Sentence-level heuristics
  const heuristicClusters = heuristicSplitter(sentence);
  
  // Merge both approaches and remove duplicates
  const mergedFeatures = mergeClusters(llmClusters, heuristicClusters);
  
  // If no features were found, fall back to treating the entire sentence as one feature
  if (mergedFeatures.length === 0) {
    return [{
      title: sentence,
      description: sentence,
      slug: createSlug(sentence),
      confidence: 'medium'
    }];
  }
  
  return mergedFeatures;
}

/**
 * Stage A: LLM-based clustering for semantic understanding
 */
async function llmClustering(sentence: string): Promise<FeatureStub[]> {
  // System prompt to guide the reasoning model
  const systemPrompt = `You are an analyst specialized in breaking down complex requirements into clear, distinct features.
When given a sentence that may describe multiple features, your job is to split it into separate atomic features.

Return a JSON object with the following structure:
{
  "features": [
    {
      "title": "A clear, concise name for the feature (3-8 words)",
      "description": "A detailed explanation of what this specific feature entails (1-3 sentences)",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Each feature should be minimal and standalone. Do not overlap functionality between features.
If the sentence describes just one feature, return an array with a single object.
Set confidence to "low" if you're unsure about the feature, "medium" if reasonably confident, "high" if very confident.

IMPORTANT: Return ONLY valid JSON that can be parsed with JSON.parse().`;

  // User prompt with the sentence to split
  const userPrompt = `Return a JSON features object for distinct minimal features expressed in this sentence: "${sentence}"`;

  try {
    // Call the reasoning model to split the features
    const result = await reason(userPrompt, systemPrompt);
    
    // Parse the JSON response
    let parsedResponse: LlmClusteringResponse;
    try {
      parsedResponse = JSON.parse(result);
    } catch (error) {
      console.error('Error parsing model response as JSON:', error);
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       result.match(/(\{[\s\S]*?\})/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.error('Failed to extract JSON from response:', innerError);
          return [];
        }
      } else {
        return [];
      }
    }
    
    // Validate and transform the parsed features
    if (!parsedResponse || !parsedResponse.features || !Array.isArray(parsedResponse.features)) {
      console.error('Model did not return expected features array');
      return [];
    }
    
    // Create slugs and ensure all properties exist
    return parsedResponse.features.map(feature => ({
      title: feature.title || 'Untitled Feature',
      description: feature.description || feature.title || 'No description provided',
      slug: feature.slug || createSlug(feature.title || 'untitled-feature'),
      confidence: feature.confidence || 'medium'
    }));
  } catch (error) {
    console.error('Error in llmClustering:', error);
    return [];
  }
}

/**
 * Stage B: Sentence-level heuristics to catch additional splits
 */
function heuristicSplitter(sentence: string): FeatureStub[] {
  const features: FeatureStub[] = [];
  
  // Split on specific patterns
  const sentenceSplits = sentence
    // Split on "and", "but" when they represent separate features
    .split(/\s+and\s+|\s+but\s+/i)
    // Further split on commas followed by gerunds or action verbs
    .flatMap(s => s.split(/,\s*(?=\w+ing\b|\ballow|\bcreate|\bupdate|\bdelete|\benable|\bdisable|\bview|\bsearch|\badd|\bremove|\bedit|\bmanage)/i));
  
  // Process each potential split
  for (const split of sentenceSplits) {
    // Skip if too short to be a meaningful feature
    if (split.trim().length < 10) continue;
    
    // Create a feature for each significant split
    features.push({
      title: split.trim(),
      description: split.trim(),
      slug: createSlug(split.trim()),
      confidence: 'medium' // Heuristic splits get medium confidence
    });
  }
  
  return features;
}

/**
 * Merge LLM and heuristic clusters, removing duplicates
 */
function mergeClusters(llmClusters: FeatureStub[], heuristicClusters: FeatureStub[]): FeatureStub[] {
  // Combine both sets of features
  const allFeatures = [...llmClusters, ...heuristicClusters];
  
  // Use a map to deduplicate by title similarity
  const uniqueFeatures = new Map<string, FeatureStub>();
  
  for (const feature of allFeatures) {
    let isDuplicate = false;
    
    // Check against existing features for similarity
    for (const [key, existingFeature] of uniqueFeatures.entries()) {
      // Simple title similarity check (could be enhanced with more sophisticated similarity)
      const normalizedTitle1 = feature.title.toLowerCase().replace(/\W+/g, ' ').trim();
      const normalizedTitle2 = existingFeature.title.toLowerCase().replace(/\W+/g, ' ').trim();
      
      if (normalizedTitle1 === normalizedTitle2 || 
          normalizedTitle1.includes(normalizedTitle2) || 
          normalizedTitle2.includes(normalizedTitle1)) {
        // Prefer LLM clusters over heuristic ones when merging
        if (feature.confidence === 'high' && existingFeature.confidence !== 'high') {
          uniqueFeatures.set(key, feature);
        }
        isDuplicate = true;
        break;
      }
    }
    
    // Add if not a duplicate
    if (!isDuplicate) {
      uniqueFeatures.set(feature.slug, feature);
    }
  }
  
  return Array.from(uniqueFeatures.values());
} 