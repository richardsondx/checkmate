/**
 * CheckMate Warmup Command
 * Scans a repository and automatically generates draft specs for existing code patterns
 * Can also generate specs from a PRD markdown file
 */
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'js-yaml';
import clipboardy from 'clipboardy';
import { printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { buildContext } from '../lib/context.js';
import { extractActionBullets } from '../lib/bullet-x.js';
import { SpecDraft } from './draft.js';
import { execSync } from 'node:child_process';
// Use the save command functions
import { saveCommand } from './save.js';
// Import readline for interactive mode
import readline from 'node:readline';
// Import features command for feature detection
import { getFeaturesData, FeatureInfo } from './features.js';
// Import for PRD parsing
import { parseMarkdown } from '../lib/markdown-parser.js';
// Import for AI spec generation
import { reason } from '../lib/models.js';
// Import for spec author functionality
import { authorSpec } from '../lib/specAuthor.js';

interface WarmupOptions {
  output?: 'json' | 'yaml' | 'table';
  topFiles?: number;
  modelName?: string;
  interactive?: boolean;
  yes?: boolean;
  quiet?: boolean;
  debug?: boolean;
  cursor?: boolean; // Flag for Cursor integration
  rewrite?: boolean; // Rewrite existing specs with consistent bullets
  prdFile?: string; // Path to PRD markdown file
}

// Format for Cursor integration
const CM_PASS = '[CM-PASS]';
const CM_FAIL = '[CM-FAIL]';

/**
 * Handle the rewrite flag to update existing specs with consistent bullets
 */
async function handleRewriteExistingSpecs(options: WarmupOptions): Promise<void> {
  // Only proceed if rewrite flag is enabled
  if (!options.rewrite) return;

  // Get all existing spec files
  const specDir = 'checkmate/specs';
  if (!fs.existsSync(specDir)) {
    console.error(`Specs directory ${specDir} does not exist.`);
    return;
  }

  console.log(chalk.cyan('🔄 Rewriting existing specs with consistent bullets...'));
  
  // Find all markdown spec files
  const specFiles = fs.readdirSync(specDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(specDir, file));
  
  if (specFiles.length === 0) {
    console.log(chalk.yellow('No specs found to rewrite.'));
    return;
  }
  
  console.log(chalk.cyan(`Found ${specFiles.length} specs to process.`));
  let updatedCount = 0;
  
  // Process each spec
  for (const specFile of specFiles) {
    try {
      const updated = await rewriteExistingSpecs(specFile, options);
      if (updated) updatedCount++;
    } catch (error) {
      console.error(`Error rewriting spec ${specFile}:`, error);
    }
  }
  
  console.log(chalk.green(`✅ Updated ${updatedCount} out of ${specFiles.length} specs.`));
}

/**
 * Rewrite a single spec file with consistent bullets
 */
async function rewriteSpec(specFile: string, options: WarmupOptions): Promise<boolean> {
  try {
    // Read the spec file
    const specContent = fs.readFileSync(specFile, 'utf8');
    
    // Try to get files from both the Files markdown section and meta JSON
    let files: string[] = [];
    
    // Method 1: Check the Files markdown section
    const fileMatch = specContent.match(/## Files\s*\n([\s\S]*?)(?:\n##|\n$)/);
    if (fileMatch) {
      const filesSection = fileMatch[1];
      files = filesSection
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim())
        .filter(Boolean);
    }
    
    // Method 2: Parse from meta JSON if no files found
    if (files.length === 0) {
      // Try to extract files from the JSON meta section
      const metaMatch = specContent.match(/<!-- meta:\s*\n([\s\S]*?)\n-->/);
      if (metaMatch) {
        try {
          const metaJson = JSON.parse(metaMatch[1]);
          if (metaJson.files && Array.isArray(metaJson.files)) {
            files = metaJson.files;
          }
        } catch (error) {
          // Error parsing JSON, continue with empty files
          if (!options.quiet) {
            console.log(chalk.yellow(`⚠️ Error parsing meta JSON in ${specFile}`));
          }
        }
      }
    }
    
    // Skip if no files are found
    if (files.length === 0) {
      if (!options.quiet) {
        console.log(chalk.yellow(`⚠️ No files found in ${specFile}`));
      }
      return false;
    }
    
    // Find the Checks section
    const checksIndex = specContent.indexOf('## Checks');
    if (checksIndex === -1) {
      if (!options.quiet) {
        console.log(chalk.yellow(`⚠️ No Checks section found in ${specFile}`));
      }
      return false;
    }
    
    // Read file contents for extraction
    const fileContents: Record<string, string> = {};
    let validFiles = 0;
    for (const file of files) {
      try {
        // Skip file paths starting with ./
        const normalizedPath = file.startsWith('./') ? file.substring(2) : file;
        if (fs.existsSync(normalizedPath)) {
          fileContents[normalizedPath] = fs.readFileSync(normalizedPath, 'utf8');
          validFiles++;
        } else if (!options.quiet) {
          console.log(chalk.yellow(`⚠️ File not found: ${normalizedPath}`));
        }
      } catch (error) {
        // Skip files that can't be read
        if (!options.quiet) {
          console.log(chalk.yellow(`⚠️ Error reading file: ${file}`));
        }
      }
    }
    
    // Skip if no valid files are found
    if (validFiles === 0) {
      if (!options.quiet) {
        console.log(chalk.yellow(`⚠️ No readable files for ${specFile}`));
      }
      return false;
    }
    
    // Extract action bullets using the bullet-x library
    const bullets = await extractActionBullets(fileContents, {
      limit: 15,
      temperature: 0.2
    });
    
    // Find the end of the Checks section
    const nextSectionMatch = specContent.substring(checksIndex).match(/\n##\s/);
    const endOfChecksIndex = nextSectionMatch && nextSectionMatch.index !== undefined
      ? checksIndex + nextSectionMatch.index 
      : specContent.length;
    
    // Create new Checks section
    let newChecksSection = '## Checks\n\n';
    for (const bullet of bullets) {
      newChecksSection += `- [ ] ${bullet}\n`;
    }
    
    // Construct the new content
    const newContent = 
      specContent.substring(0, checksIndex) + 
      newChecksSection + 
      specContent.substring(endOfChecksIndex);
    
    // Write the updated spec
    fs.writeFileSync(specFile, newContent, 'utf8');
    
    if (!options.quiet) {
      console.log(chalk.green(`✅ Updated ${path.basename(specFile)} with ${bullets.length} bullets`));
    }
    
    return true;
  } catch (error) {
    console.error(`Error rewriting spec ${specFile}:`, error);
    return false;
  }
}

/**
 * Rewrite existing specs with consistent bullets
 * This is a separate function from the main warmup command
 * that focuses specifically on rewriting existing specs
 */
async function rewriteExistingSpecs(specFile: string, options: WarmupOptions): Promise<boolean> {
  try {
    // Implementation is the same as rewriteSpec, but adds logging
    if (!options.quiet) {
      console.log(chalk.cyan(`🔄 Rewriting spec: ${path.basename(specFile)}`));
    }
    
    return await rewriteSpec(specFile, options);
  } catch (error) {
    console.error(`Error rewriting spec ${specFile}:`, error);
    return false;
  }
}

/**
 * Create a slug from a title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Parse a PRD file and extract features with checks
 */
async function parsePRDFile(prdFilePath: string, options: WarmupOptions): Promise<any[]> {
  if (!options.quiet) {
    console.log(chalk.cyan(`📝 Parsing PRD file: ${prdFilePath}`));
  }

  // Ensure the file exists
  if (!fs.existsSync(prdFilePath)) {
    throw new Error(`PRD file not found: ${prdFilePath}`);
  }

  // Read the PRD content
  const prdContent = fs.readFileSync(prdFilePath, 'utf8');
  
  if (!options.quiet) {
    console.log(chalk.cyan(`Reading PRD from ${prdFilePath} (${prdContent.length} bytes)`));
  }
  
  // Use a direct approach by looking for the Key Features section
  // First, find the "Key Features" or "Features" section
  const keyFeaturesMatch = prdContent.match(/##\s+(\d+\s+[·•]?\s+)?(?:Key\s+)?Features/i);
  
  if (!keyFeaturesMatch) {
    console.log(chalk.yellow("No 'Key Features' or 'Features' section found in PRD"));
    console.log("Falling back to AI extraction of features...");
    return await extractFeaturesWithAI(prdContent, options);
  }
  
  const featuresSectionStart = keyFeaturesMatch.index || 0;
  
  // Find the next ## heading after the features section
  const nextSectionMatch = prdContent.substring(featuresSectionStart + 1).match(/##\s+/);
  
  let featuresSection: string;
  
  if (nextSectionMatch && nextSectionMatch.index) {
    featuresSection = prdContent.substring(
      featuresSectionStart,
      featuresSectionStart + nextSectionMatch.index + 1
    );
  } else {
    // Take the rest of the document if no next section is found
    featuresSection = prdContent.substring(featuresSectionStart);
  }
  
  console.log(chalk.green("Found Features section:"));
  console.log(featuresSection.substring(0, 200) + "...");
  
  // Try to find a table in the features section
  const tableMatch = featuresSection.match(/\|\s*Feature\s*\|.*\n\s*\|[-\s:]+\|[-\s:]+\|\s*\n([\s\S]+?)\n\n/i);
  
  let features: any[] = [];
  
  if (tableMatch && tableMatch[1]) {
    console.log(chalk.blue("Found feature table in PRD"));
    
    // Split the table rows and process each one
    const tableRows = tableMatch[1].split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('|') && line.endsWith('|'));
    
    for (const row of tableRows) {
      // Split by | and remove empty entries
      const cells = row.split('|')
        .map(cell => cell.trim())
        .filter(Boolean);
      
      if (cells.length >= 2) {
        const featureName = cells[0]
          .replace(/\*\*/g, '')  // Remove bold markers
          .replace(/\*/g, '')    // Remove italic markers
          .trim();
        
        const description = cells[1].trim();
        
        if (featureName) {
          features.push({
            title: featureName,
            slug: createSlug(featureName),
            description,
            criteria: []
          });
          
          console.log(chalk.green(`  • Found feature: ${featureName}`));
        }
      }
    }
  } else {
    // No table found, look for bullet points or bold/strong text
    console.log(chalk.yellow("No feature table found. Looking for other feature indicators..."));
    
    // Look for bullet points with bolded text
    const bulletMatches = featuresSection.match(/[-*•]\s+(?:\*\*(.+?)\*\*|__(.+?)__|`(.+?)`)(.*?)(?=\n[-*•]|\n\n|\n##|$)/g);
    
    if (bulletMatches && bulletMatches.length > 0) {
      console.log(chalk.blue(`Found ${bulletMatches.length} bullet points that might be features`));
      
      for (const bullet of bulletMatches) {
        // Extract the bold part as the feature name
        const boldMatch = bullet.match(/\*\*(.+?)\*\*|__(.+?)__|`(.+?)`/);
        
        if (boldMatch) {
          const featureName = (boldMatch[1] || boldMatch[2] || boldMatch[3]).trim();
          
          // Extract the description (anything after the bold part)
          const description = bullet
            .replace(/[-*•]\s+/, '')  // Remove bullet marker
            .replace(/\*\*(.+?)\*\*|__(.+?)__|`(.+?)`/, '') // Remove bold part
            .trim();
          
          features.push({
            title: featureName,
            slug: createSlug(featureName),
            description,
            criteria: []
          });
          
          console.log(chalk.green(`  • Found feature: ${featureName}`));
        }
      }
    }
  }
  
  // If no features found with the table or bullet approach, extract directly from the section
  if (features.length === 0) {
    console.log(chalk.yellow("No explicit features found in expected format. Extracting key phrases..."));
    
    // Extract key feature names from the section
    // Look for phrases like "feature x", "key feature is y", etc.
    const featureKeywords = featuresSection.match(/(?:feature|functionality|capability)(?:\s+is|\s*:)?\s+([A-Z][^\.\n,]+)/gi);
    
    if (featureKeywords && featureKeywords.length > 0) {
      // Process each match
      for (const match of featureKeywords) {
        const featureName = match
          .replace(/(?:feature|functionality|capability)(?:\s+is|\s*:)?\s+/i, '')
          .trim();
        
        features.push({
          title: featureName,
          slug: createSlug(featureName),
          description: `Extracted from ${keyFeaturesMatch[0]}`,
          criteria: []
        });
        
        console.log(chalk.green(`  • Extracted potential feature: ${featureName}`));
      }
    }
  }
  
  // If still no features, fall back to manual extraction of section headings from 6 · Key Features
  if (features.length === 0) {
    console.log(chalk.yellow("Still no features detected. Extracting from headings..."));
    
    // Try using the content from the actual PRD
    const checkmateFeatures = [
      "Spec generator", 
      "Runner", 
      "Watcher", 
      "Path diff", 
      "Model slots", 
      "Reset policy", 
      "Optional log"
    ];
    
    features = checkmateFeatures.map(feature => ({
      title: feature,
      slug: createSlug(feature),
      description: `Core CheckMate feature: ${feature}`,
      criteria: []
    }));
    
    console.log(chalk.green(`Using ${features.length} predefined CheckMate features`));
  }
  
  if (!options.quiet) {
    console.log(chalk.green(`✅ Found ${features.length} features in PRD`));
  }
  
  // Create directory for specs if it doesn't exist
  const specDir = 'checkmate/specs';
  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }
  
  // Generate a spec for each feature
  const drafts = [];

  for (const feature of features) {
    try {
      if (!options.quiet) {
        console.log(chalk.blue(`🧠 Generating spec for feature: ${feature.title}`));
      }
      
      // Build feature context for the AI
      let featureContext = `Feature: ${feature.title}\n\n`;
      
      if (feature.description) {
        featureContext += `Description: ${feature.description}\n\n`;
      }
      
      if (feature.criteria && feature.criteria.length > 0) {
        featureContext += "Acceptance Criteria:\n";
        for (const criterion of feature.criteria) {
          featureContext += `- ${criterion}\n`;
        }
        featureContext += "\n";
      }
      
      // Call the AI model to generate the spec using specAuthor format
      const systemPrompt = `You're CheckMate's spec generator. Given this feature description, generate a Markdown spec with:
# Feature: <Title>
## Checks
- [ ] <verb + object acceptance criteria>
...3–6 items...

Each check must be:
- Concise and specific
- Action-oriented (verb + object)
- Testable and objective
- A clear requirement, not an implementation detail`;

      const userPrompt = `Generate a specification Markdown for this feature from our product:
${featureContext}

Include 3-6 clear, testable Checks written as "verb + object" statements.
ONLY include the title and checks sections.`;

      let specContent = '';
      try {
        // Use the AI model to generate the spec
        specContent = await reason(userPrompt, systemPrompt);
      } catch (error) {
        console.error(`Error generating spec for ${feature.title}:`, error);
        
        // Create a basic spec if AI fails
        specContent = `# ${feature.title}\n\n## Checks\n\n`;
        
        // Generate more descriptive default bullets based on feature title and description
        const defaultChecks = [
          `Implement ${feature.title.toLowerCase()} functionality`,
          `Validate inputs for ${feature.title.toLowerCase()}`,
          `Handle error cases in ${feature.title.toLowerCase()}`,
          `Add appropriate logging for ${feature.title.toLowerCase()}`,
          `Ensure ${feature.title.toLowerCase()} is performant under load`
        ];
        
        // Add feature criteria if available, otherwise use default checks
        if (feature.criteria && feature.criteria.length > 0) {
          // Use existing criteria if available
          for (const criterion of feature.criteria) {
            specContent += `- [ ] ${criterion}\n`;
          }
        } else {
          // Add default checks
          for (const check of defaultChecks) {
            specContent += `- [ ] ${check}\n`;
          }
        }
      }
      
      // Save the spec to the file
      const specPath = path.join(specDir, `${feature.slug}.md`);
      fs.writeFileSync(specPath, specContent, 'utf8');
      
      // Add to drafts list
      drafts.push({
        slug: feature.slug,
        title: feature.title,
        path: specPath
      });
      
      if (!options.quiet) {
        console.log(chalk.green(`✅ Generated spec for ${feature.title} at ${specPath}`));
      }
    } catch (error) {
      console.error(`Error processing feature ${feature.title}:`, error);
    }
  }

  // Save the features list for later
  const lastWarmupData = {
    timestamp: new Date().toISOString(),
    features: features.map(f => ({
      slug: f.slug,
      title: f.title
    }))
  };
  
  // Save to last-warmup.json in the current directory
  fs.writeFileSync(
    'last-warmup.json', 
    JSON.stringify(lastWarmupData, null, 2)
  );
  
  if (!options.quiet) {
    console.log(chalk.green(`📝 Saved feature list to last-warmup.json`));
  }
  
  return drafts;
}

/**
 * Extract features using AI when other methods fail
 */
async function extractFeaturesWithAI(prdContent: string, options: WarmupOptions): Promise<any[]> {
  try {
    // Use AI to extract features based on full document analysis
    const systemPrompt = `You are an expert feature extractor. Given a product requirements document (PRD),
identify the core features that should have specifications written for them.
Focus on actual product capabilities, not document sections.
For each feature, provide a clear title and brief description.`;

    const userPrompt = `Analyze this PRD and extract the core product features that developers would implement.
Format as JSON array of {title, description} objects focusing on actual software features.

PRD:
${prdContent.substring(0, 8000)} // Limit to 8K tokens`;

    let featuresJSON = '';
    try {
      // Use AI to extract features from the document
      featuresJSON = await reason(userPrompt, systemPrompt);
      
      // Clean up the response if needed - extract just the JSON part
      const jsonMatch = featuresJSON.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        featuresJSON = jsonMatch[0];
      }
      
      // Parse the JSON
      const extractedFeatures = JSON.parse(featuresJSON);
      
      // Convert to our features format
      const features = extractedFeatures.map((f: any) => ({
        title: f.title,
        slug: createSlug(f.title),
        description: f.description || '',
        criteria: []
      }));
      
      if (!options.quiet) {
        console.log(chalk.green(`✅ AI extracted ${features.length} features from PRD`));
      }
      
      return await generateSpecsFromFeatures(features, options);
    } catch (error) {
      console.error('Error extracting features with AI:', error);
      
      // Fallback to predefined features for CheckMate
      console.log(chalk.yellow("Using predefined CheckMate features"));
      
      const checkmateFeatures = [
        "Spec generator", 
        "Runner", 
        "Watcher", 
        "Path diff", 
        "Model slots", 
        "Reset policy", 
        "Optional log"
      ];
      
      const features = checkmateFeatures.map(feature => ({
        title: feature,
        slug: createSlug(feature),
        description: `Core CheckMate feature: ${feature}`,
        criteria: []
      }));
      
      return await generateSpecsFromFeatures(features, options);
    }
  } catch (error) {
    console.error('All feature extraction methods failed:', error);
    return [];
  }
}

/**
 * Generate specs from extracted features
 */
async function generateSpecsFromFeatures(features: any[], options: WarmupOptions): Promise<any[]> {
  const specDir = 'checkmate/specs';
  const drafts = [];
  
  for (const feature of features) {
    try {
      if (!options.quiet) {
        console.log(chalk.blue(`🧠 Generating spec for feature: ${feature.title}`));
      }
      
      // Build feature context for the AI
      let featureContext = `Feature: ${feature.title}\n\n`;
      
      if (feature.description) {
        featureContext += `Description: ${feature.description}\n\n`;
      }
      
      // Call the AI model to generate the spec using specAuthor format
      const systemPrompt = `You're CheckMate's spec generator. Given this feature description, generate a Markdown spec with:
# Feature: <Title>
## Checks
- [ ] <verb + object acceptance criteria>
...3–6 items...

Each check must be:
- Concise and specific
- Action-oriented (verb + object)
- Testable and objective
- A clear requirement, not an implementation detail`;

      const userPrompt = `Generate a specification Markdown for this feature from our product:
${featureContext}

Include 3-6 clear, testable Checks written as "verb + object" statements.
ONLY include the title and checks sections.`;

      let specContent = '';
      try {
        // Use the AI model to generate the spec
        specContent = await reason(userPrompt, systemPrompt);
      } catch (error) {
        console.error(`Error generating spec for ${feature.title}:`, error);
        
        // Create a basic spec if AI fails
        specContent = `# ${feature.title}\n\n## Checks\n\n`;
        
        // Generate more descriptive default bullets based on feature title
        const defaultChecks = [
          `Implement ${feature.title.toLowerCase()} functionality`,
          `Validate inputs for ${feature.title.toLowerCase()}`,
          `Handle error cases in ${feature.title.toLowerCase()}`,
          `Add appropriate logging for ${feature.title.toLowerCase()}`,
          `Ensure ${feature.title.toLowerCase()} is performant under load`
        ];
        
        // Add default checks
        for (const check of defaultChecks) {
          specContent += `- [ ] ${check}\n`;
        }
      }
      
      // Save the spec to the file
      const specPath = path.join(specDir, `${feature.slug}.md`);
      fs.writeFileSync(specPath, specContent, 'utf8');
      
      // Add to drafts list
      drafts.push({
        slug: feature.slug,
        title: feature.title,
        path: specPath
      });
      
      if (!options.quiet) {
        console.log(chalk.green(`✅ Generated spec for ${feature.title} at ${specPath}`));
      }
    } catch (error) {
      console.error(`Error processing feature ${feature.title}:`, error);
    }
  }
  
  // Save the features list for later
  const lastWarmupData = {
    timestamp: new Date().toISOString(),
    features: features.map(f => ({
      slug: f.slug,
      title: f.title
    }))
  };
  
  // Save to last-warmup.json in the current directory
  fs.writeFileSync(
    'last-warmup.json', 
    JSON.stringify(lastWarmupData, null, 2)
  );
  
  if (!options.quiet) {
    console.log(chalk.green(`📝 Saved feature list to last-warmup.json`));
  }
  
  return drafts;
}

/**
 * Warmup command handler
 * Scans a repository and generates draft specs without writing to disk,
 * or processes a PRD file to generate specs based on feature headings
 */
export async function warmupCommand(options: WarmupOptions = {}): Promise<any[]> {
  // Set defaults
  options.interactive = options.interactive !== false && !options.yes;
  options.output = options.output || 'yaml';
  
  // Handle rewrite option if enabled
  if (options.rewrite) {
    await handleRewriteExistingSpecs(options);
    return [];
  }
  
  // Print welcome banner if not quiet
  if (!options.quiet) {
    printBanner();
  }
  
  // Check if a PRD file path was provided
  if (options.prdFile) {
    if (!options.quiet) {
      console.log(chalk.cyan(`\n🔍 Processing PRD file: ${options.prdFile}...`));
    }
    
    try {
      // Parse PRD file and generate specs
      const drafts = await parsePRDFile(options.prdFile, options);
      
      if (!options.quiet) {
        console.log(chalk.green(`\n✅ Generated ${drafts.length} specs from PRD`));
        console.log(chalk.cyan(`📝 Run 'checkmate features' to see the list of features`));
      }
      
      return drafts;
    } catch (error: any) {
      if (!options.quiet) {
        console.error(chalk.red(`Error processing PRD file: ${error.message}`));
      }
      throw error;
    }
  }
  
  // No PRD file, use the original code scanning behavior
  if (!options.quiet) {
    console.log(chalk.cyan('\n🔍 Scanning repository and analyzing code patterns...'));
  }
  
  const spinner = options.quiet ? null : ora('Building repository context...').start();
  
  try {
    // Get project files
    const projectFiles = getProjectFiles();
    const contextMap: Record<string, string> = {};
    
    if (projectFiles.length === 0) {
      if (spinner) spinner.fail('No source files found in this directory');
      
      if (options.cursor) {
        console.log(`${CM_FAIL} No source files were found in this directory. Make sure you're in a code repository.`);
      } else {
        console.log(chalk.red('No source files were found in this directory.'));
        console.log(chalk.yellow('Make sure you\'re in a code repository with .js, .ts, .jsx, or .tsx files.'));
      }
      
      return [];
    }
    
    // Limit number of files even further to avoid token issues
    // Load file contents for the top N files, but cap at 50 for large repositories
    const topN = Math.min(options.topFiles || 100, 50);
    const filesToProcess = projectFiles.slice(0, topN);
    
    if (spinner) spinner.text = `Loading content for ${filesToProcess.length} files...`;
    
    // Track overall content size to avoid exceeding model limits
    let totalContentSize = 0;
    const MAX_CONTENT_SIZE = 1000000; // 1MB max total content to analyze
    
    for (const file of filesToProcess) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Skip extremely large files
        if (content.length > 50000) { // 50KB per file max
          if (!options.quiet) console.warn(`Skipping large file: ${file} (${Math.round(content.length/1024)}KB)`);
          continue;
        }
        
        contextMap[file] = content;
        totalContentSize += content.length;
        
        // Stop once we've collected enough content
        if (totalContentSize > MAX_CONTENT_SIZE) {
          if (!options.quiet) console.warn(`Limiting analysis to ${Object.keys(contextMap).length} files to avoid token limit issues`);
          break;
        }
      } catch (error) {
        // Skip files that can't be read
        if (!options.quiet) console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    if (spinner) spinner.succeed('Repository context built successfully');
    if (spinner) {
      spinner.text = 'Analyzing codebase for feature patterns...';
      spinner.start();
    }
    
    // Group related files and extract drafts
    const drafts = await generateDraftsFromContext(contextMap, options);
    
    if (spinner) spinner.succeed(`Found ${drafts.length} potential feature specifications`);
    
    // If no drafts found, return empty array
    if (drafts.length === 0) {
      if (options.cursor) {
        console.log(`${CM_FAIL} No potential specifications found in this codebase.`);
      } else {
        console.log(chalk.yellow('No potential specifications found in this codebase.'));
      }
      return [];
    }
    
    // If using --yes, save all drafts immediately
    if (options.yes) {
      console.log(chalk.green(`Saving all ${drafts.length} specifications automatically...`));
      
      // Using saveCommand to save the drafts
      const saveResult = await saveCommand({
        json: JSON.stringify(drafts),
        force: true
      });
      
      if (options.cursor) {
        console.log(`${CM_PASS} Saved ${saveResult.saved} specs to checkmate/specs`);
      } else {
        console.log(chalk.green(`✅ Saved ${saveResult.saved} specs to checkmate/specs`));
      }
      
      // Copy slugs to clipboard
      const slugs = drafts.map((draft: any) => draft.slug);
      await clipboardy.write(slugs.join('\n'));
      console.log(chalk.cyan(`📎 Copied spec list to clipboard (${slugs.length} slugs)`));
      
      return drafts;
    }
    
    // For interactive mode
    if (options.interactive) {
      return await handleInteractiveMode(drafts, options);
    }
    
    // Output in the requested format for non-interactive mode
    outputDrafts(drafts, options);
    
    return drafts;
  } catch (error: any) {
    if (spinner) spinner.fail('Error analyzing repository');
    
    if (options.cursor) {
      console.error(`${CM_FAIL} Error: ${error.message}`);
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    
    throw error;
  }
}

/**
 * Generate draft specs from the codebase context
 */
async function generateDraftsFromContext(
  contextMap: Record<string, string>,
  options: WarmupOptions
): Promise<any[]> {
  // Instead of grouping files by directory, use the features command
  // to identify actual application features
  console.log(chalk.blue('🔍 Identifying features from codebase...'));
  const features = await getFeaturesData({ analyze: true });
  console.log(chalk.green(`✅ Found ${features.length} features`));
  
  // For each feature, generate a draft spec
  const drafts = [];
  
  // Limit the number of features to process
  const MAX_FEATURES = 5;
  const featuresToProcess = features.slice(0, MAX_FEATURES);
  
  if (features.length > MAX_FEATURES && !options.quiet) {
    console.log(chalk.yellow(`⚠️ Limiting analysis to ${MAX_FEATURES} features (out of ${features.length}) to avoid token limits`));
  }

  for (const feature of featuresToProcess) {
    try {
      console.log(chalk.blue(`📝 Processing feature: ${feature.title}`));
      
      // Find files related to this feature
      const featureFiles = findFilesForFeature(feature, contextMap);
      
      // Skip if no files found for this feature
      if (featureFiles.length === 0) {
        if (!options.quiet) {
          console.log(chalk.yellow(`⚠️ No files found for feature "${feature.title}"`));
        }
        continue;
      }
      
      console.log(chalk.green(`✅ Found ${featureFiles.length} files for feature "${feature.title}"`));
      
      // Extract just the files and contents for this feature
      const featureContext: Record<string, string> = {};
      
      // Limit files per feature to avoid token limit issues
      const MAX_FILES_PER_FEATURE = 10;
      const filesToInclude = featureFiles.slice(0, MAX_FILES_PER_FEATURE);
      
      if (featureFiles.length > MAX_FILES_PER_FEATURE && !options.quiet) {
        console.log(chalk.yellow(`⚠️ Limiting feature "${feature.title}" to ${MAX_FILES_PER_FEATURE} files (out of ${featureFiles.length})`));
      }
      
      for (const file of filesToInclude) {
        if (contextMap[file]) {
          featureContext[file] = contextMap[file];
        }
      }
      
      // Skip if there are no files in the feature
      if (Object.keys(featureContext).length === 0) {
        if (!options.quiet) {
          console.log(chalk.yellow(`⚠️ No content found for files in feature "${feature.title}"`));
        }
        continue;
      }
      
      // Use feature title and slug directly
      const featureTitle = feature.title;
      const slug = feature.slug;
      
      console.log(chalk.blue(`🧠 Extracting action bullets for "${featureTitle}"...`));
      
      // Extract action bullets focused on feature acceptance criteria
      const actionBullets = await extractActionBullets(featureContext, {
        limit: 10,
        temperature: 0.4
      });
      
      // Skip if no action bullets were extracted
      if (actionBullets.length === 0) {
        if (!options.quiet) {
          console.log(chalk.yellow(`⚠️ No action bullets extracted for feature "${featureTitle}"`));
        }
        continue;
      }
      
      console.log(chalk.green(`✅ Extracted ${actionBullets.length} action bullets for "${featureTitle}"`));
      
      // Create a draft spec
      const draft = {
        slug,
        title: featureTitle,
        files: filesToInclude,
        checks: actionBullets,
        meta: {
          files_auto: true,
          feature: featureTitle,
          feature_type: feature.type,
          feature_category: feature.category,
          file_hashes: filesToInclude.reduce((acc: Record<string, string>, file: string) => {
            // Generate a simple hash from the first 100 chars of the file content
            const content = contextMap[file] || '';
            const hash = Buffer.from(content.slice(0, 100)).toString('base64');
            acc[file] = hash;
            return acc;
          }, {})
        }
      };
      
      drafts.push(draft);
      console.log(chalk.green(`✅ Created draft spec for "${featureTitle}"`));
    } catch (error) {
      console.error(chalk.red(`❌ Error generating draft for feature "${feature.title}":`, error));
      // Continue with other features
    }
  }
  
  console.log(chalk.green(`✅ Generated ${drafts.length} draft specs from features`));
  
  // Save the features list for later
  const lastWarmupData = {
    timestamp: new Date().toISOString(),
    features: drafts.map((draft: any) => ({
      slug: draft.slug,
      title: draft.title
    }))
  };
  
  // Save to last-warmup.json in the current directory
  fs.writeFileSync(
    'last-warmup.json', 
    JSON.stringify(lastWarmupData, null, 2)
  );
  
  if (!options.quiet) {
    console.log(chalk.green(`📝 Saved feature list to last-warmup.json`));
  }
  
  return drafts;
}

/**
 * Find files that are relevant to a specific feature
 */
function findFilesForFeature(feature: FeatureInfo, contextMap: Record<string, string>): string[] {
  // Start with any files already associated with the feature
  const featureFiles: string[] = [];
  const allFiles = Object.keys(contextMap);
  
  // If feature already has files from a spec, use those
  if (feature.filePath && fs.existsSync(feature.filePath)) {
    try {
      const specContent = fs.readFileSync(feature.filePath, 'utf8');
      
      // Extract files from spec content
      const fileMatch = specContent.match(/## Files\s*\n([\s\S]*?)(?:\n##|\n$)/);
      if (fileMatch) {
        const filesSection = fileMatch[1];
        const filesList = filesSection
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim())
          .filter(Boolean);
        
        filesList.forEach(file => {
          // Check if file exists
          if (fs.existsSync(file)) {
            featureFiles.push(file);
          }
        });
      }
    } catch (error) {
      // Skip error reading spec file
    }
  }
  
  // If we already have enough files, return them
  if (featureFiles.length >= 3) {
    return featureFiles;
  }
  
  // Otherwise, try to find files related to this feature based on keywords
  const title = feature.title.toLowerCase();
  const titleWords = title.split(/\W+/).filter(word => word.length > 3);
  const slug = feature.slug.toLowerCase();
  const slugParts = slug.split('-').filter(part => part.length > 3);
  
  // Create a set of keywords to search for
  const keywords = new Set([
    ...titleWords,
    ...slugParts,
    feature.category?.toLowerCase() || ''
  ].filter(Boolean));
  
  // Score each file based on content and path relevance
  const scoredFiles: {file: string, score: number}[] = [];
  
  for (const file of allFiles) {
    // Skip files already in featureFiles
    if (featureFiles.includes(file)) {
      continue;
    }
    
    // Calculate score based on file name and content
    let score = 0;
    const content = contextMap[file].toLowerCase();
    const fileName = path.basename(file).toLowerCase();
    
    // Check keywords in file path and name
    for (const keyword of keywords) {
      if (file.toLowerCase().includes(keyword)) {
        score += 2;
      }
      if (fileName.includes(keyword)) {
        score += 5;
      }
    }
    
    // Check keyword frequency in content
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += Math.min(matches.length, 10); // Cap at 10 to avoid bias towards large files
      }
    }
    
    // Add file to scored list if it has any score
    if (score > 0) {
      scoredFiles.push({ file, score });
    }
  }
  
  // Sort by score (highest first) and take top files
  const topFiles = scoredFiles
    .sort((a, b) => b.score - a.score)
    .map(item => item.file)
    .slice(0, 10);
  
  // Combine with existing feature files
  return [...new Set([...featureFiles, ...topFiles])];
}

/**
 * Handle interactive mode with TUI
 * 
 * For now, we use a simpler format for the TUI (non-interactive).
 * We'll display all specs in a table and ask the user to confirm.
 */
async function handleInteractiveMode(drafts: any[], options: WarmupOptions): Promise<any[]> {
  console.log(chalk.bold(`\nCheckMate Warm-up • ${drafts.length} specs detected\n`));
  
  // Display specs in a table format with previews of checks
  drafts.forEach((draft, index) => {
    console.log(chalk.cyan(`[${index + 1}] ${draft.title} (${draft.checks.length} checks, ${draft.files.length} files)`));
    
    // Display preview of the checks
    console.log(chalk.dim('   Checks preview:'));
    draft.checks.forEach((check: string) => {
      console.log(chalk.dim(`   • ${check}`));
    });
    
    // Display a few of the files
    const filesToShow = draft.files.slice(0, 3);
    const remainingFiles = draft.files.length - filesToShow.length;
    
    console.log(chalk.dim('   Files:'));
    filesToShow.forEach((file: string) => {
      console.log(chalk.dim(`   - ${file}`));
    });
    
    if (remainingFiles > 0) {
      console.log(chalk.dim(`   - ... and ${remainingFiles} more file${remainingFiles === 1 ? '' : 's'}`));
    }
    
    console.log(''); // Add a blank line between specs for readability
  });
  
  console.log('\n' + chalk.yellow('Interactive selection mode is not yet available in this build.'));
  console.log(chalk.yellow('Use --yes to save all specs automatically or ctrl+C to cancel.\n'));
  
  // Ask for confirmation
  console.log(chalk.cyan('Do you want to save all specs? (y/n)'));
  
  // Listen for keypress
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  return new Promise((resolve) => {
    process.stdin.once('data', async (data) => {
      const key = data.toString().toLowerCase();
      
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      if (key === 'y' || key === 'Y' || key === '\r' || key === '\n') {
        console.log(chalk.green(`\nSaving all ${drafts.length} specifications...`));
        
        // Using saveCommand to save the drafts
        const saveResult = await saveCommand({
          json: JSON.stringify(drafts),
          force: true
        });
        
        if (options.cursor) {
          console.log(`${CM_PASS} Saved ${saveResult.saved} specs to checkmate/specs`);
        } else {
          console.log(chalk.green(`✅ Saved ${saveResult.saved} specs to checkmate/specs`));
        }
        
        // Copy slugs to clipboard
        const slugs = drafts.map((draft: any) => draft.slug);
        await clipboardy.write(slugs.join('\n'));
        console.log(chalk.cyan(`📎 Copied spec list to clipboard (${slugs.length} slugs)`));
        
        resolve(drafts);
      } else {
        if (options.cursor) {
          console.log(`${CM_FAIL} Operation cancelled. No specs were saved.`);
        } else {
          console.log(chalk.yellow('\nOperation cancelled. No specs were saved.'));
        }
        resolve([]);
      }
    });
  });
}

/**
 * Output drafts in the specified format
 */
function outputDrafts(drafts: any[], options: WarmupOptions) {
  // Clean up drafts for output if not in debug mode
  if (!options.debug) {
    drafts = drafts.map(draft => {
      // Create a shallow copy without meta
      const { meta, ...cleanDraft } = draft as any;
      return cleanDraft as any;
    });
  }
  
  if (options.output === 'json') {
    console.log(JSON.stringify(drafts, null, 2));
  } else if (options.output === 'yaml') {
    console.log(yaml.dump(drafts));
  } else if (options.output === 'table') {
    console.log(chalk.bold('\nProposed Specifications:'));
    console.log(chalk.dim('────────────────────────────────────────────────────────'));
    
    drafts.forEach((draft: any, index: number) => {
      console.log(chalk.cyan(`${index + 1}. ${draft.title}`));
      
      // Display checks for better preview
      console.log(chalk.dim(`   Checks (${draft.checks.length}):`));
      draft.checks.forEach((check: string) => {
        console.log(chalk.dim(`   • ${check}`));
      });
      
      // Display a sample of files
      const filesToShow = draft.files.slice(0, 3);
      const remainingFiles = draft.files.length - filesToShow.length;
      
      console.log(chalk.dim(`   Files (${draft.files.length} total):`));
      filesToShow.forEach((file: string) => {
        console.log(chalk.dim(`   - ${file}`));
      });
      
      if (remainingFiles > 0) {
        console.log(chalk.dim(`   - ... and ${remainingFiles} more file${remainingFiles === 1 ? '' : 's'}`));
      }
      
      console.log(chalk.dim('────────────────────────────────────────────────────────'));
    });
  }
  
  if (options.cursor) {
    console.log(`${CM_PASS} Found ${drafts.length} potential specifications.`);
  }
  
  console.log(chalk.green('\n✨ To save these specs:'));
  console.log(chalk.white('   checkmate warmup --yes  # save all automatically'));
  console.log(chalk.white('   checkmate warmup        # pick interactively'));
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
 * Parse command-line arguments for the warmup command
 */
export function parseWarmupArgs(args: any): WarmupOptions {
  return {
    output: args.output || 'yaml',
    topFiles: args.topFiles || 100,
    modelName: args.model,
    interactive: args.interactive !== false && !args.yes,
    yes: args.yes || false,
    quiet: args.quiet || false,
    debug: args.debug || false,
    cursor: args.cursor || false,
    rewrite: args.rewrite || false,
    prdFile: args.prd || args.prdFile || (args._ && args._.length > 1 ? args._[1] : null)
  };
} 