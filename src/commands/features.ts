/**
 * Features command for CheckMate CLI
 * Identifies and manages actual application features by analyzing codebase
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import { indexSpecs, Feature } from '../lib/indexSpecs.js';
import enquirer from 'enquirer';
import { printBanner } from '../ui/banner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scan } from '../lib/tree.js';
import { createLanguageModel } from '../lib/modelWrapper.js';
import { load as loadConfig } from '../lib/config.js';
import { execSync } from 'node:child_process';

// Valid status types
type StatusType = 'PASS' | 'FAIL' | 'STALE' | 'UNKNOWN';

// Feature type with additional information
export interface FeatureInfo extends Feature {
  description?: string;
  category?: string;
  identified_by: 'code_analysis' | 'spec_file' | 'both';
}

/**
 * Run the features command
 */
export async function featuresCommand(options: {
  json?: boolean;
  search?: string;
  type?: string;
  status?: string;
  interactive?: boolean;
  fail?: boolean;
  pass?: boolean;
  stale?: boolean;
  analyze?: boolean; // New option to force code analysis
}): Promise<string | undefined> {
  try {
    // Default to table view unless explicitly requested to be interactive
    // This ensures the default behavior without arguments is table view
    const useInteractive = options.interactive === true;
    
    // Convert convenience flags to status
    let statusFilter: StatusType | undefined = undefined;
    if (options.fail) {
      statusFilter = 'FAIL';
    } else if (options.pass) {
      statusFilter = 'PASS';
    } else if (options.stale) {
      statusFilter = 'STALE';
    } else if (options.status) {
      // Validate and convert the status string to our enum type
      const status = options.status.toUpperCase();
      if (['PASS', 'FAIL', 'STALE', 'UNKNOWN'].includes(status)) {
        statusFilter = status as StatusType;
      }
    }
    
    // For options.analyze, we need to run codebase analysis
    const forceAnalysis = options.analyze === true;
    
    // Get features data - first from specs, then augment with code analysis
    const specFeatures = indexSpecs({
      search: options.search,
      type: options.type?.toUpperCase(), // Make sure type filter is uppercase
      status: statusFilter
    });
    
    // Convert spec features to our enhanced format
    const featureMap = new Map<string, FeatureInfo>();
    specFeatures.forEach(feature => {
      featureMap.set(feature.slug, {
        ...feature,
        identified_by: 'spec_file'
      });
    });
    
    // Identify features directly from code, always do this if forceAnalysis is true
    // or if we found very few spec features
    if (forceAnalysis || featureMap.size < 3) {
      const codeFeatures = await identifyFeaturesFromCode();
      
      // Merge code features with spec features
      codeFeatures.forEach(codeFeature => {
        if (featureMap.has(codeFeature.slug)) {
          // Update existing feature
          const existing = featureMap.get(codeFeature.slug)!;
          featureMap.set(codeFeature.slug, {
            ...existing,
            description: codeFeature.description || existing.description,
            category: codeFeature.category || existing.category,
            identified_by: 'both'
          });
        } else {
          // Add new feature
          featureMap.set(codeFeature.slug, codeFeature);
        }
      });
    }
    
    // Convert map back to array
    const allFeatures = Array.from(featureMap.values());
    
    // Post-filter features if needed
    const filteredFeatures = allFeatures.filter(feature => {
      // Apply search filter if specified
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        const titleMatch = feature.title.toLowerCase().includes(searchTerm);
        const slugMatch = feature.slug.toLowerCase().includes(searchTerm);
        const descMatch = feature.description?.toLowerCase().includes(searchTerm);
        
        if (!titleMatch && !slugMatch && !descMatch) {
          return false;
        }
      }
      
      // Apply type filter if specified
      if (options.type && feature.type !== options.type.toUpperCase()) {
        return false;
      }
      
      // Apply status filter if specified
      if (statusFilter && feature.status !== statusFilter) {
        return false;
      }
      
      return true;
    });
    
    // Handle JSON output regardless of feature count
    if (options.json) {
      console.log(JSON.stringify(filteredFeatures, null, 2));
      return JSON.stringify(filteredFeatures);
    }
    
    // Exit early if no features found
    if (filteredFeatures.length === 0) {
      console.log('No features found matching your criteria.');
      return undefined;
    }
    
    // Handle interactive mode - only if explicitly requested
    if (useInteractive) {
      return await showInteractivePrompt(filteredFeatures);
    }
    
    // Default: Display features in a table
    showFeaturesTable(filteredFeatures);
    return undefined;
  } catch (error) {
    console.error('Error running features command:', error);
    return undefined;
  }
}

/**
 * Identify features by analyzing the codebase directly
 */
async function identifyFeaturesFromCode(): Promise<FeatureInfo[]> {
  console.log('🔍 Analyzing codebase to identify features...');
  // Get all project files
  const files = getProjectFiles();
  if (!files || files.length === 0) {
    console.log('⚠️ No files found to analyze');
    return [];
  }
  
  console.log(`📁 Found ${files.length} files to analyze`);
  
  // Sample a subset of files to analyze (to avoid token limits)
  const MAX_FILES = 30;
  const filesToAnalyze = files.slice(0, MAX_FILES);
  
  // Read the content of these files
  const fileContents: Record<string, string> = {};
  let totalSize = 0;
  const MAX_TOTAL_CHARS = 300000; // ~300KB max to avoid token limits
  
  console.log(`📄 Reading content from up to ${MAX_FILES} files...`);
  for (const file of filesToAnalyze) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Skip extremely large files
        if (content.length > 30000) { // 30KB per file max
          console.log(`⚠️ Skipping large file: ${file} (${Math.round(content.length/1024)}KB)`);
          continue;
        }
        
        fileContents[file] = content;
        totalSize += content.length;
        
        if (totalSize > MAX_TOTAL_CHARS) {
          console.log(`⚠️ Reached content size limit of ${Math.round(MAX_TOTAL_CHARS/1024)}KB. Stopping file reading.`);
          break;
        }
      }
    } catch (error) {
      // Skip files that can't be read
      console.warn(`⚠️ Could not read file ${file}: ${error}`);
    }
  }
  
  console.log(`📊 Analyzing content from ${Object.keys(fileContents).length} files (${Math.round(totalSize/1024)}KB total)`);
  
  // Prepare the file content for analysis
  const codeContext = Object.entries(fileContents)
    .map(([filePath, content]) => `// FILE: ${filePath}\n${content.substring(0, 2000)}`)
    .join('\n\n// -------- NEXT FILE --------\n\n');
  
  // Get the model to use for feature analysis
  const config = loadConfig();
  const modelName = config.models?.reason || 'gpt-4o';
  console.log(`🤖 Using model ${modelName} for feature analysis`);
  const model = createLanguageModel(modelName);
  
  // Create a prompt to extract features
  const prompt = `
You are an expert software architect analyzing a codebase to identify key features.

Please identify distinct application features by analyzing the provided code files.
A feature is a cohesive piece of functionality that delivers value to users or the system.

For each feature you identify:
1. Provide a concise title (e.g., "User Authentication", "Task Management")
2. Create a kebab-case slug (e.g., "user-auth", "task-management")
3. Categorize it (e.g., "core", "ui", "api", "utility")
4. Write a brief 1-2 sentence description
5. Identify whether it's a USER feature (end-user facing) or AGENT feature (system/internal)

Focus on actual application features, not technical components or modules.
Good examples: "User Authentication", "Todo Management", "Payment Processing"
Bad examples: "Utils Module", "Components Library", "API Layer"

CODE TO ANALYZE:
${codeContext}

Return your analysis as a JSON array with this exact schema:
[{
  "title": "Feature Title",
  "slug": "feature-slug",
  "type": "USER",  // or "AGENT"
  "category": "category-name",
  "description": "Brief feature description",
  "identified_by": "code_analysis"
}]

Identify 5-10 distinct features.
`;

  console.log('🧠 Sending analysis request to model...');
  try {
    const response = await model.complete(prompt, {
      temperature: 0.2,
      max_tokens: 1500,
    });
    
    console.log('✅ Received response from model');
    
    // Extract the JSON from the response
    const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      try {
        const features = JSON.parse(jsonMatch[0]) as FeatureInfo[];
        
        // Add missing properties with defaults
        const enhancedFeatures = features.map(feature => ({
          ...feature,
          fileCount: 0,
          status: 'UNKNOWN' as StatusType,
          filePath: '',
          identified_by: 'code_analysis' as 'code_analysis' | 'spec_file' | 'both'
        }));
        
        console.log(`✨ Successfully extracted ${enhancedFeatures.length} features from code analysis`);
        return enhancedFeatures;
      } catch (parseError) {
        console.error('❌ Error parsing JSON from model response:', parseError);
        console.log('Raw response:', response);
        return [];
      }
    } else {
      console.warn('⚠️ Could not find JSON array in model response');
      console.log('Raw response:', response);
      return [];
    }
  } catch (error) {
    console.error('❌ Error analyzing codebase for features:', error);
    return [];
  }
}

/**
 * Get list of files in the project
 */
function getProjectFiles(): string[] {
  try {
    // Load config to get tree command
    const config = loadConfig();
    const treeCmd = config.tree_cmd || "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'";
    
    try {
      // Execute tree command
      const output = execSync(treeCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      
      // Split output by lines and clean up
      const files = output
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean); // Filter empty lines
      
      if (files.length > 0) {
        // Additional filtering to exclude non-application files
        const filteredFiles = files.filter(file => {
          // Skip common non-application paths
          const excludePaths = [
            'node_modules/',
            '.git/',
            'dist/',
            'build/',
            'checkmate/',
            '.checkmate-telemetry/',
            '.cursor/',
            'dist-test/',
            'tests/',
            'test/',
            'scripts/',
            'wiki/',
            'memory-docs/',
            'examples/',
            'examples.bak/',
            'temp-test/'
          ];
          
          return !excludePaths.some(excludePath => 
            file.startsWith(excludePath) || file.includes('/' + excludePath)
          );
        });
        
        return filteredFiles;
      } else {
        // Fall back to filesystem search if no files found via git
        console.log('No files found via git, falling back to filesystem search...');
        return findFilesRecursive();
      }
    } catch (error) {
      // More graceful error handling for git command failures
      console.log('Git command failed, using filesystem search instead...');
      return findFilesRecursive();
    }
  } catch (error) {
    console.error('Error getting project files:', error);
    console.log('Falling back to filesystem search...');
    return findFilesRecursive();
  }
}

/**
 * Fallback method to find files recursively using the filesystem
 */
function findFilesRecursive(dir = '.', fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      // Normalize paths for more reliable matching
      const normalizedPath = path.normalize(filePath);
      
      // Expanded list of directories to exclude
      const exclusions = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'checkmate', // Exclude checkmate's own infrastructure
        '.checkmate-telemetry', // Exclude telemetry data 
        '.cursor', // Exclude cursor config
        'dist-test', // Exclude test builds
        'tests', // Exclude test directories
        'test', // Common test directory name
        'scripts', // Often contains build/utility scripts, not app features
        'wiki', // Documentation, not code
        'memory-docs', // Documentation, not code
        'examples', // Examples, not core app code
        'examples.bak', // Backup examples
        'temp-test' // Temporary test files
      ];

      // Check if this file should be excluded
      // We need to check if the path contains any of these patterns as directories
      // e.g. "node_modules/", ".git/", etc.
      const shouldExclude = exclusions.some(excluded => {
        const exclusionPattern = path.sep + excluded + path.sep; // e.g. "/node_modules/"
        const startsWithPattern = normalizedPath.startsWith(excluded + path.sep); // e.g. "node_modules/"
        return normalizedPath.includes(exclusionPattern) || startsWithPattern;
      });
      
      if (shouldExclude) {
        return;
      }
      
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          findFilesRecursive(filePath, fileList);
        } else if (/\.(ts|js|tsx|jsx)$/.test(filePath)) {
          fileList.push(filePath);
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Warning: Could not access ${filePath}`);
      }
    });
    
    return fileList;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return fileList;
  }
}

/**
 * Display features data in a table format
 */
function showFeaturesTable(features: FeatureInfo[]): void {
  // Print banner
  printBanner();
  
  console.log(`📊 ${features.length} Features\n`);
  
  // Create a table for output with box drawing characters
  const table = new Table({
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    },
    head: [
      'Slug',
      'Title',
      chalk.magenta('Type'),
      'Status',
      'Source',
      'Files'
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [25, 35, 8, 8, 10, 7]  // Set fixed column widths for better formatting
  });
  
  // Add each feature to the table
  for (const feature of features) {
    // Format slug with colors - for compound slugs like add-todo, highlight each part
    let slug = feature.slug;
    if (slug.includes('-')) {
      const parts = slug.split('-');
      slug = `${chalk.magenta(parts[0])}-${parts.slice(1).join('-')}`;
    }
    
    // Format title with colors as in the example
    let title = feature.title;
    if (title.toLowerCase().includes("todo")) {
      // If title has "todo" in it, color "Add" purple and "new" as gold/yellow
      title = title
        .replace(/Add/i, (match) => chalk.magenta(match))
        .replace(/new/i, (match) => chalk.hex('#B5A642')(match));
    } else if (title.toLowerCase().includes("login")) {
      // If title has "login" in it, color "User" and "login" purple
      title = title
        .replace(/User/i, (match) => chalk.magenta(match))
        .replace(/login/i, (match) => chalk.magenta(match));
    } else if (title.toLowerCase().includes("subscription") || title.toLowerCase().includes("billing")) {
      // If title has "billing" or "subscription", color "Subscription" purple
      title = title
        .replace(/Subscription/i, (match) => chalk.magenta(match));
    }
    
    // Format status with appropriate colors exactly as in the example
    let status: string;
    if (feature.status === 'PASS') {
      status = 'PASS';  // black (default) in example
    } else if (feature.status === 'FAIL') {
      status = 'FAIL';  // black (default) in example
    } else if (feature.status === 'STALE') {
      status = 'STALE';  // black (default) in example
    } else {
      status = 'UNKNOWN';  // gray in example
    }
    
    // Format source
    let source = '';
    if (feature.identified_by === 'spec_file') {
      source = chalk.cyan('spec');
    } else if (feature.identified_by === 'code_analysis') {
      source = chalk.green('code');
    } else {
      source = chalk.blue('both');
    }
    
    // Color file count in gold
    const fileCount = chalk.hex('#B5A642')(feature.fileCount.toString());
    
    table.push([
      slug,
      title,
      feature.type,  // Already colored by the column header being colored
      status,
      source,
      fileCount
    ]);
  }
  
  // Print the table
  console.log(table.toString());
  
  // Print summary with counts
  const passCount = features.filter(f => f.status === 'PASS').length;
  const failCount = features.filter(f => f.status === 'FAIL').length;
  const staleCount = features.filter(f => f.status === 'STALE').length;
  const unknownCount = features.filter(f => f.status === 'UNKNOWN').length;
  
  console.log(`\n${chalk.green(`✅ ${passCount} passing`)}, ${chalk.red(`❌ ${failCount} failing`)}, ${chalk.yellow(`⚠️ ${staleCount} stale`)}, ${chalk.gray(`❓ ${unknownCount} unknown`)}\n`);
}

/**
 * Show interactive prompt for selecting features
 */
async function showInteractivePrompt(features: FeatureInfo[]): Promise<string> {
  // Handle empty features list
  if (features.length === 0) {
    console.log('No features available for selection.');
    return '';
  }
  
  // Create choices for prompt
  const choices = features.map(feature => {
    let statusIcon = '❓';
    if (feature.status === 'PASS') {
      statusIcon = '✅';
    } else if (feature.status === 'FAIL') {
      statusIcon = '❌';
    } else if (feature.status === 'STALE') {
      statusIcon = '⚠️';
    }
    
    return {
      name: feature.slug,
      message: `${statusIcon} ${feature.slug} - ${feature.title}`,
      value: feature.slug
    };
  });
  
  try {
    // Create prompt
    const prompt = new (enquirer as any).AutoComplete({
      name: 'feature',
      message: 'Select a feature:',
      choices
    });
    
    // Show prompt and return selected slug
    const result = await prompt.run();
    return result;
  } catch (error) {
    console.error('Error in interactive prompt:', error);
    return '';
  }
}

/**
 * Get features data for API endpoint
 */
export async function getFeaturesData(options: {
  search?: string;
  type?: string;
  status?: string;
  analyze?: boolean;
} = {}): Promise<FeatureInfo[]> {
  // Get spec-based features
  let statusFilter: StatusType | undefined = undefined;
  
  if (options.status) {
    const status = options.status.toUpperCase();
    if (['PASS', 'FAIL', 'STALE', 'UNKNOWN'].includes(status)) {
      statusFilter = status as StatusType;
    }
  }
  
  const specFeatures = indexSpecs({
    search: options.search,
    type: options.type?.toUpperCase(),
    status: statusFilter
  });
  
  // Convert to our enhanced format
  const featureMap = new Map<string, FeatureInfo>();
  specFeatures.forEach(feature => {
    featureMap.set(feature.slug, {
      ...feature,
      identified_by: 'spec_file'
    });
  });
  
  // If analyze is true, also get code-based features
  if (options.analyze || featureMap.size < 3) {
    const codeFeatures = await identifyFeaturesFromCode();
    
    // Merge code features with spec features
    codeFeatures.forEach(codeFeature => {
      if (featureMap.has(codeFeature.slug)) {
        // Update existing feature
        const existing = featureMap.get(codeFeature.slug)!;
        featureMap.set(codeFeature.slug, {
          ...existing,
          description: codeFeature.description || existing.description,
          category: codeFeature.category || existing.category,
          identified_by: 'both'
        });
      } else {
        // Add new feature
        featureMap.set(codeFeature.slug, codeFeature);
      }
    });
  }
  
  // Convert map to array and sort by slug
  return Array.from(featureMap.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}

// Execute the features command when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✨ Running features command directly');
  
  // Parse arguments
  const args = process.argv.slice(2);
  const options: any = {
    analyze: args.includes('--analyze'),
    json: args.includes('--json'),
    debug: args.includes('--debug')
  };
  
  console.log('📋 Options:', options);
  
  // Run the command
  featuresCommand(options)
    .then(() => {
      console.log('✅ Features command completed');
    })
    .catch(error => {
      console.error('❌ Error in features command:', error);
      process.exit(1);
    });
}