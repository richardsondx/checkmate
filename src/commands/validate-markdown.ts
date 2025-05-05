/**
 * Markdown Validation Command
 * 
 * Validates Markdown files against the CommonMark specification
 * or GitHub Flavored Markdown (GFM) specification
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import * as markdownParser from '../lib/markdown-parser.js';

// Interface for command options
interface ValidateMarkdownOptions {
  file?: string;
  dir?: string;
  spec?: string;
  strict?: boolean;
  extended?: boolean;
  output?: string;
  verbose?: boolean;
}

/**
 * Run the validate-markdown command
 */
export async function validateMarkdown(options: ValidateMarkdownOptions = {}): Promise<void> {
  try {
    console.log(chalk.cyan('🔍 Validating Markdown...'));
    
    // Determine which specification to use
    let spec = markdownParser.MarkdownSpec.COMMONMARK;
    if (options.spec === 'github' || options.spec === 'gfm') {
      spec = markdownParser.MarkdownSpec.GFM;
    } else if (options.spec === 'checkmate') {
      spec = markdownParser.MarkdownSpec.CHECKMATE;
    }
    
    // Set parser options
    const parserOptions = {
      spec,
      strict: options.strict !== false,
      extendedSyntax: options.extended === true
    };
    
    // Process a single file or directory
    let results: markdownParser.ValidationResult[] = [];
    
    if (options.file) {
      const filePath = path.resolve(options.file);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      console.log(chalk.yellow(`\nValidating file: ${filePath}`));
      results = [markdownParser.validateMarkdownFile(filePath, parserOptions)];
    } else if (options.dir) {
      const dirPath = path.resolve(options.dir);
      
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      console.log(chalk.yellow(`\nValidating directory: ${dirPath}`));
      results = markdownParser.validateMarkdownDirectory(dirPath, parserOptions);
    } else {
      throw new Error('Either --file or --dir must be specified');
    }
    
    // Process validation results
    const totalFiles = results.length;
    const validFiles = results.filter(r => r.valid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.filter(e => e.severity === 'error').length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.errors.filter(e => e.severity === 'warning').length, 0);
    
    // Display results
    let outputText = '';
    
    for (const result of results) {
      if (!result.valid || options.verbose) {
        for (const error of result.errors) {
          const prefix = error.severity === 'error' ? chalk.red('Error') : chalk.yellow('Warning');
          const message = `${prefix}: ${error.message} [${error.rule}]`;
          console.log(message);
          outputText += `${message}\n`;
        }
      }
    }
    
    // Write output to file if requested
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, outputText, 'utf8');
      console.log(chalk.green(`\nResults saved to: ${outputPath}`));
    }
    
    // Print summary
    console.log(chalk.white('\n----------------------------------------'));
    console.log(chalk.white(`Files: ${validFiles}/${totalFiles} valid`));
    console.log(chalk.red(`Errors: ${totalErrors}`));
    console.log(chalk.yellow(`Warnings: ${totalWarnings}`));
    
    if (validFiles === totalFiles) {
      console.log(chalk.green('\n✅ All files are valid!'));
    } else {
      console.log(chalk.red(`\n❌ ${totalFiles - validFiles} files have validation errors.`));
      process.exit(1); // Exit with non-zero code if there are errors
    }
  } catch (error: any) {
    console.error(chalk.red('Error validating Markdown:'), error.message);
    process.exit(1);
  }
}

/**
 * Generate a test suite for Markdown elements
 */
export async function generateMarkdownTestSuite(outputPath?: string): Promise<void> {
  const testCases = [
    {
      name: 'Headings',
      markdown: '# Heading 1\n## Heading 2\n### Heading 3',
      expected: '<h1>Heading 1</h1>\n<h2>Heading 2</h2>\n<h3>Heading 3</h3>'
    },
    {
      name: 'Paragraphs',
      markdown: 'This is paragraph 1.\n\nThis is paragraph 2.',
      expected: '<p>This is paragraph 1.</p>\n<p>This is paragraph 2.</p>'
    },
    {
      name: 'Emphasis',
      markdown: '*Italic* and **Bold** and ***Both***',
      expected: '<p><em>Italic</em> and <strong>Bold</strong> and <em><strong>Both</strong></em></p>'
    },
    {
      name: 'Lists',
      markdown: '- Item 1\n- Item 2\n  - Nested Item\n- Item 3',
      expected: '<ul>\n<li>Item 1</li>\n<li>Item 2\n<ul>\n<li>Nested Item</li>\n</ul>\n</li>\n<li>Item 3</li>\n</ul>'
    },
    {
      name: 'Code Blocks',
      markdown: '```javascript\nconst x = 1;\n```',
      expected: '<pre><code class="language-javascript">const x = 1;\n</code></pre>'
    },
    {
      name: 'Links',
      markdown: '[Link Text](https://example.com)',
      expected: '<p><a href="https://example.com">Link Text</a></p>'
    },
    {
      name: 'Blockquotes',
      markdown: '> This is a quote\n> More quote',
      expected: '<blockquote>\n<p>This is a quote\nMore quote</p>\n</blockquote>'
    },
    {
      name: 'Tables (GFM)',
      markdown: '| A | B |\n| --- | --- |\n| 1 | 2 |',
      expected: '<table>\n<thead>\n<tr>\n<th>A</th>\n<th>B</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>1</td>\n<td>2</td>\n</tr>\n</tbody>\n</table>'
    }
  ];
  
  console.log(chalk.cyan('🧪 Running Markdown test suite...'));
  
  let output = '# Markdown Rendering Test Results\n\n';
  let allPassed = true;
  
  for (const test of testCases) {
    console.log(chalk.yellow(`\nTesting: ${test.name}`));
    
    const result = await markdownParser.testMarkdownRendering(
      test.markdown,
      test.expected,
      { spec: markdownParser.MarkdownSpec.GFM, extendedSyntax: true }
    );
    
    if (result.passed) {
      console.log(chalk.green('✅ PASS'));
      output += `## ✅ ${test.name}\n\n`;
    } else {
      console.log(chalk.red('❌ FAIL'));
      console.log('Expected:');
      console.log(test.expected);
      console.log('Actual:');
      console.log(result.actualHtml);
      console.log('Diff:');
      console.log(result.diff);
      
      output += `## ❌ ${test.name}\n\n`;
      output += '### Expected\n\n```html\n' + test.expected + '\n```\n\n';
      output += '### Actual\n\n```html\n' + result.actualHtml + '\n```\n\n';
      
      allPassed = false;
    }
    
    output += `### Markdown\n\n\`\`\`markdown\n${test.markdown}\n\`\`\`\n\n`;
  }
  
  // Write output to file if specified
  if (outputPath) {
    const fullPath = path.resolve(outputPath);
    fs.writeFileSync(fullPath, output, 'utf8');
    console.log(chalk.green(`\nTest results saved to: ${fullPath}`));
  }
  
  // Print summary
  console.log(chalk.white('\n----------------------------------------'));
  if (allPassed) {
    console.log(chalk.green(`\n✅ All ${testCases.length} tests passed!`));
  } else {
    console.log(chalk.red(`\n❌ Some tests failed.`));
    process.exit(1);
  }
} 