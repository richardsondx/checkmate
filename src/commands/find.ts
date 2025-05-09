/**
 * Find spec command for CheckMate CLI
 * Uses AI to find specs based on their content rather than just filenames
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { listSpecs } from '../lib/specs.js';
import { parseSpec } from '../lib/specs.js';
import { getOpenAI, SpecMatch } from '../lib/openai.js';

/**
 * Find a spec by description using AI
 */
export async function findCommand(options: {
  query: string;
  quiet?: boolean;
  cursor?: boolean;
  json?: boolean;
}): Promise<any> {
  try {
    if (!options.query) {
      if (options.cursor) {
        console.error('[CM-FAIL] A description query is required');
      } else {
        console.error(chalk.red('❌ A description query is required'));
        console.log('Usage: checkmate find "<spec description>"');
      }
      return { error: true, message: 'Missing query parameter' };
    }

    // Get all specs
    const specFiles = listSpecs();
    
    if (specFiles.length === 0) {
      if (options.cursor) {
        console.error('[CM-FAIL] No specs found in the checkmate/specs directory');
      } else {
        console.error(chalk.red('❌ No specs found in the checkmate/specs directory'));
        console.log('Generate specs with "checkmate warmup" or create a new one with "checkmate create"');
      }
      return { error: true, message: 'No specs found' };
    }

    // Extract content and metadata from all specs
    const specs = await Promise.all(specFiles.map(async (file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const parsedSpec = parseSpec(file);
        return {
          path: file,
          basename: path.basename(file),
          title: parsedSpec.title || path.basename(file, path.extname(file)),
          content: content
        };
      } catch (error) {
        return null;
      }
    }));

    const validSpecs = specs.filter(spec => spec !== null) as {
      path: string;
      basename: string;
      title: string;
      content: string;
    }[];

    // Use OpenAI to find the best matching specs
    const openai = await getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a tool for analyzing software specifications. Given a query and a list of specs, return the ones most relevant to the query. Focus on semantic meaning rather than just keyword matching."
        },
        {
          role: "user",
          content: `Find specs that match this description: "${options.query}". 
          
Return all relevant matches, ranked by relevance.

Spec files to analyze:
${validSpecs.map(spec => `
--- ${spec.basename} ---
${spec.content.substring(0, 500)}... (truncated)
`).join('\n')}

Return your response as a JSON object with this format:
{
  "matches": [
    {
      "path": "path/to/spec.md",
      "relevance": 0.95, // 0-1 score of relevance
      "title": "Spec Title",
      "reason": "Brief explanation of why this spec matches"
    }
  ]
}

Only include specs with relevance > 0.6.
`
        }
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"matches":[]}') as { matches: SpecMatch[] };
    
    if (!result.matches || result.matches.length === 0) {
      if (options.cursor) {
        console.error(`[CM-FAIL] No specs found matching "${options.query}"`);
      } else if (!options.quiet) {
        console.error(chalk.red(`❌ No specs found matching "${options.query}"`));
      }
      return { error: true, message: 'No matching specs found' };
    }

    // Return the response based on the output format
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    if (options.cursor) {
      console.log(`[CM-INFO] Found ${result.matches.length} specs matching "${options.query}"`);
      result.matches.forEach(match => {
        console.log(`[CM-MATCH] ${match.title} (${match.path}) - Relevance: ${Math.round(match.relevance * 100)}%`);
      });
    } else if (!options.quiet) {
      console.log(chalk.green(`✅ Found ${result.matches.length} specs matching "${options.query}"`));
      console.log();
      
      result.matches.forEach(match => {
        console.log(`${chalk.cyan(match.title)} ${chalk.gray(`(${path.basename(match.path)})`)} - ${chalk.yellow(`${Math.round(match.relevance * 100)}%`)}`);
        console.log(chalk.gray(`${match.reason}`));
        console.log();
      });
    }

    return result;
  } catch (error) {
    if (options.cursor) {
      console.error(`[CM-FAIL] Error finding specs: ${error instanceof Error ? error.message : String(error)}`);
    } else if (!options.quiet) {
      console.error(chalk.red('❌ Error finding specs:'), error);
    }
    return { error: true, message: String(error) };
  }
} 