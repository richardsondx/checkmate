/**
 * Context builder for CheckMate CLI
 * Scans project files, ranks them by relevance to a feature, and returns the top-N most relevant
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import fastGlob from 'fast-glob';
import stringSimilarity from 'string-similarity';
import { load as loadConfig } from './config.js';
import { FeatureStub } from './splitter.js';
import * as tree from './tree.js';
import { createEmbedding, cosineSimilarity } from './embeddings.js';

/**
 * Context file interface representing a file with its relevance
 */
export interface ContextFile {
  path: string;
  relevance: number;
  reason?: string;
}

// Cache for file embeddings
interface EmbeddingCache {
  [filePath: string]: {
    embedding: number[];
    timestamp: number;
  };
}

// In-memory cache for embeddings
let embeddingCache: EmbeddingCache = {};

/**
 * Scan project files and rank them by relevance to a feature
 */
export async function buildContext(feature: FeatureStub, allFiles?: boolean, explicitFiles?: string[]): Promise<ContextFile[]> {
  const config = loadConfig();
  const topN = config.context_top_n || 40; // Default to 40 if not specified
  const useEmbeddings = config.use_embeddings !== false; // Default to true if not specified
  
  // If explicit files are provided, use them directly
  if (explicitFiles && explicitFiles.length > 0) {
    return explicitFiles.map(filePath => ({
      path: filePath,
      relevance: 1.0,
      reason: 'Explicitly specified file'
    }));
  }
  
  // If allFiles is true, scan all file types; otherwise, focus on code files
  const extensions = allFiles 
    ? [] 
    : ['ts', 'js', 'tsx', 'jsx'];
  
  // Get all files from the project
  let files: string[];
  try {
    // Use tree.scan for code files or fastGlob for all files
    if (extensions.length > 0) {
      files = await tree.scan(extensions);
    } else {
      // Using fast-glob to get all files while excluding node_modules and hidden dirs
      files = await fastGlob(['**/*'], {
        ignore: ['**/node_modules/**', '**/.*/**', '**/dist/**'],
        dot: false,
        onlyFiles: true
      });
    }
  } catch (error) {
    console.error('Error scanning files:', error);
    return [];
  }
  
  // Extract keywords from feature title and description
  const keywords = extractKeywords(`${feature.title} ${feature.description}`);
  
  // Rank files by relevance to the feature keywords
  const rankedFiles = useEmbeddings 
    ? await rankFilesByEmbeddings(files, `${feature.title} ${feature.description}`) 
    : await rankFilesByKeywords(files, keywords);
  
  // Take the top N most relevant files
  return rankedFiles.slice(0, topN);
}

/**
 * Extract keywords from a string by removing common words and punctuation
 */
function extractKeywords(text: string): string[] {
  // Common words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
    'by', 'about', 'as', 'into', 'like', 'through', 'after', 'before', 'between',
    'from', 'up', 'down', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
    'should', 'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'whose',
    'this', 'these', 'those', 'am', 'what', 'when', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
  ]);
  
  // Convert to lowercase, replace punctuation with spaces, and split by whitespace
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word && !stopWords.has(word) && word.length > 2);
  
  // Return unique keywords
  return [...new Set(words)];
}

/**
 * Rank files by keyword relevance (TF-IDF style approach)
 */
async function rankFilesByKeywords(files: string[], keywords: string[]): Promise<ContextFile[]> {
  // Prepare array for file scores
  const rankedFiles: ContextFile[] = [];
  
  // For each file, calculate a relevance score
  for (const filePath of files) {
    // Skip very large files (e.g., generated files, large assets)
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
        continue;
      }
    } catch (error) {
      continue; // Skip if can't get file stats
    }
    
    // Calculate file name relevance score (filename matching keywords)
    const fileName = path.basename(filePath);
    const fileNameScore = calculateFileNameScore(fileName, keywords);
    
    // Calculate path relevance score (path containing keywords)
    const pathScore = calculatePathScore(filePath, keywords);
    
    // Read the first few lines of the file to check content relevance
    let contentScore = 0;
    let contentReason = '';
    
    try {
      const content = readFileHead(filePath, 100); // Read first 100 lines
      const contentScoreResult = calculateContentScore(content, keywords);
      contentScore = contentScoreResult.score;
      contentReason = contentScoreResult.reason || '';
    } catch (error) {
      // Skip content scoring if file can't be read
    }
    
    // Combine scores with weights
    const totalScore = (fileNameScore * 0.4) + (pathScore * 0.2) + (contentScore * 0.4);
    
    // Add to ranked files list
    rankedFiles.push({
      path: filePath,
      relevance: totalScore,
      reason: contentReason
    });
  }
  
  // Sort files by relevance score (descending)
  return rankedFiles.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Rank files using semantic embeddings for better relevance
 */
async function rankFilesByEmbeddings(files: string[], featureText: string): Promise<ContextFile[]> {
  // Generate embedding for the feature description
  const featureEmbedding = await createEmbedding(featureText);
  if (!featureEmbedding) {
    console.warn('Could not create feature embedding. Falling back to keyword matching.');
    return rankFilesByKeywords(files, extractKeywords(featureText));
  }
  
  // Prepare array for file scores
  const rankedFiles: ContextFile[] = [];
  const embedPromises: Promise<void>[] = [];
  
  // Process files in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (filePath) => {
      try {
        // Skip very large files
        const stats = fs.statSync(filePath);
        if (stats.size > 1024 * 1024) {
          return;
        }
        
        // Get file content
        const fileContent = readFileHead(filePath, 100);
        if (!fileContent) return;
        
        // Calculate traditional keyword score for hybrid approach
        const keywordScore = calculateHybridKeywordScore(filePath, fileContent, extractKeywords(featureText));
        
        // Get or create file embedding
        let fileEmbedding = await getFileEmbedding(filePath, fileContent);
        if (!fileEmbedding) return;
        
        // Calculate similarity score
        const similarityScore = cosineSimilarity(featureEmbedding, fileEmbedding);
        
        // Hybrid score: 60% embedding similarity, 40% keyword matching
        const hybridScore = (similarityScore * 0.6) + (keywordScore * 0.4);
        
        // Add to ranked files
        rankedFiles.push({
          path: filePath,
          relevance: hybridScore,
          reason: `Semantic similarity: ${Math.round(similarityScore * 100)}%`
        });
      } catch (error) {
        // Skip this file if there's an error
      }
    });
    
    embedPromises.push(...batchPromises);
    
    // Wait for this batch to complete before moving to the next
    await Promise.all(batchPromises);
  }
  
  // Sort files by relevance score (descending)
  return rankedFiles.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Get embedding for a file, using cache if available
 */
async function getFileEmbedding(filePath: string, fileContent: string): Promise<number[] | null> {
  const stats = fs.statSync(filePath);
  const mtime = stats.mtimeMs;
  
  // Check if cached embedding exists and is current
  if (embeddingCache[filePath] && embeddingCache[filePath].timestamp === mtime) {
    return embeddingCache[filePath].embedding;
  }
  
  // Create new embedding
  const embedding = await createEmbedding(fileContent);
  if (embedding) {
    // Cache the embedding
    embeddingCache[filePath] = {
      embedding,
      timestamp: mtime
    };
    return embedding;
  }
  
  return null;
}

/**
 * Calculate a combined keyword score for the hybrid approach
 */
function calculateHybridKeywordScore(filePath: string, fileContent: string, keywords: string[]): number {
  const fileName = path.basename(filePath);
  const fileNameScore = calculateFileNameScore(fileName, keywords);
  const pathScore = calculatePathScore(filePath, keywords);
  const contentScore = calculateContentScore(fileContent, keywords).score;
  
  return (fileNameScore * 0.4) + (pathScore * 0.2) + (contentScore * 0.4);
}

/**
 * Calculate a score for how well a filename matches the keywords
 */
function calculateFileNameScore(fileName: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  
  // Split filename (without extension) into parts
  const fileNameParts = path.parse(fileName).name
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .toLowerCase()
    .split(/\s+/);
  
  // Calculate matches
  let matches = 0;
  for (const keyword of keywords) {
    for (const part of fileNameParts) {
      if (part.includes(keyword) || keyword.includes(part)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / keywords.length;
}

/**
 * Calculate a score for how well a file path matches the keywords
 */
function calculatePathScore(filePath: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  
  // Normalize path
  const normalizedPath = filePath.toLowerCase().replace(/[\\/.]/g, ' ');
  
  // Count keyword matches in path
  let matches = 0;
  for (const keyword of keywords) {
    if (normalizedPath.includes(keyword)) {
      matches++;
    }
  }
  
  return matches / keywords.length;
}

/**
 * Calculate a score for how well the file content matches the keywords
 */
function calculateContentScore(content: string, keywords: string[]): { score: number; reason?: string } {
  if (keywords.length === 0 || !content) return { score: 0 };
  
  // Normalize content
  const normalizedContent = content.toLowerCase();
  
  // Count keyword occurrences in content
  const counts: { [keyword: string]: number } = {};
  let totalMatches = 0;
  
  for (const keyword of keywords) {
    // Count occurrences of this keyword
    let count = 0;
    let lastIndex = -1;
    
    while ((lastIndex = normalizedContent.indexOf(keyword, lastIndex + 1)) !== -1) {
      count++;
    }
    
    counts[keyword] = count;
    totalMatches += count;
  }
  
  // Find the top matching keyword for the reason
  let topKeyword = '';
  let topCount = 0;
  
  for (const [keyword, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topKeyword = keyword;
    }
  }
  
  // Calculate score (normalized by content length and number of keywords)
  const contentLength = normalizedContent.length / 100; // Normalize to prevent bias toward large files
  const score = Math.min(1, totalMatches / (contentLength * keywords.length));
  
  // Generate reason if we have matches
  const reason = topCount > 0 ? `Contains ${topCount} occurrences of "${topKeyword}"` : undefined;
  
  return { score, reason };
}

/**
 * Read the first N lines of a file
 */
function readFileHead(filePath: string, lines: number = 100): string {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contentLines = content.split('\n').slice(0, lines);
    return contentLines.join('\n');
  } catch (error) {
    return '';
  }
} 