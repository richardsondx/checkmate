/**
 * Features command for CheckMate CLI
 * Lists and manages features tracked by CheckMate
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import { indexSpecs, Feature } from '../lib/indexSpecs.js';
import enquirer from 'enquirer';
import { printBanner } from '../ui/banner.js';

// Valid status types
type StatusType = 'PASS' | 'FAIL' | 'STALE' | 'UNKNOWN';

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
    
    // Get features data
    const features = indexSpecs({
      search: options.search,
      type: options.type?.toUpperCase(), // Make sure type filter is uppercase
      status: statusFilter
    });
    
    // Handle JSON output regardless of feature count
    if (options.json) {
      console.log(JSON.stringify(features, null, 2));
      return JSON.stringify(features);
    }
    
    // Exit early if no features found
    if (features.length === 0) {
      console.log('No features found matching your criteria.');
      return undefined;
    }
    
    // Handle interactive mode - only if explicitly requested
    if (useInteractive) {
      return await showInteractivePrompt(features);
    }
    
    // Default: Display features in a table
    showFeaturesTable(features);
    return undefined;
  } catch (error) {
    console.error('Error running features command:', error);
    return undefined;
  }
}

/**
 * Display features data in a table format
 */
function showFeaturesTable(features: Feature[]): void {
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
      'Files'
    ],
    style: {
      head: [],
      border: []
    },
    colWidths: [30, 40, 10, 10, 7]  // Set fixed column widths for better formatting
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
    
    // Color file count in gold
    const fileCount = chalk.hex('#B5A642')(feature.fileCount.toString());
    
    table.push([
      slug,
      title,
      feature.type,  // Already colored by the column header being colored
      status,
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
async function showInteractivePrompt(features: Feature[]): Promise<string> {
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
export function getFeaturesData(options: {
  search?: string;
  type?: string;
  status?: string;
} = {}): Feature[] {
  let statusFilter: StatusType | undefined = undefined;
  
  if (options.status) {
    const status = options.status.toUpperCase();
    if (['PASS', 'FAIL', 'STALE', 'UNKNOWN'].includes(status)) {
      statusFilter = status as StatusType;
    }
  }
  
  return indexSpecs({
    search: options.search,
    type: options.type?.toUpperCase(), // Make sure type filter is uppercase
    status: statusFilter
  });
} 