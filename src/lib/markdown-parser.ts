/**
 * Complete Markdown Parser and Renderer
 * 
 * Implements the CommonMark specification for parsing and rendering Markdown.
 * Also supports extended syntax features (GFM - GitHub Flavored Markdown).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import { reporter } from 'vfile-reporter';
import chalk from 'chalk';

// Markdown spec options
export enum MarkdownSpec {
  COMMONMARK = 'commonmark',
  GFM = 'github',
  CHECKMATE = 'checkmate'
}

// Error severity types
export type ErrorSeverity = 'error' | 'warning' | 'info';

// Validation error interface
export interface MarkdownError {
  line: number;
  column: number;
  message: string;
  severity: ErrorSeverity;
  rule: string;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: MarkdownError[];
  html?: string;
  ast?: any;
}

// Interface for parser options
export interface ParserOptions {
  spec: MarkdownSpec;
  strict: boolean;
  extendedSyntax: boolean;
}

// Default parser options
const DEFAULT_OPTIONS: ParserOptions = {
  spec: MarkdownSpec.COMMONMARK,
  strict: true,
  extendedSyntax: false
};

/**
 * Create a markdown processor based on selected spec and options
 */
function createProcessor(options: Partial<ParserOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Start with unified and remarkParse (CommonMark compliant)
  let processor = unified().use(remarkParse);
  
  // Add GFM support if needed
  if (opts.spec === MarkdownSpec.GFM || opts.extendedSyntax) {
    // Use type assertion to resolve type mismatch
    processor = processor.use(remarkGfm as any);
  }
  
  // Add custom validation plugin if strict mode is enabled
  if (opts.strict) {
    processor = processor.use(() => validateMarkdownTree(opts));
  }
  
  return processor;
}

/**
 * Validate a markdown tree and report issues
 */
function validateMarkdownTree(options: ParserOptions) {
  return (tree: any, file: VFile) => {
    // Track seen headings for duplicate checking
    const seenHeadings = new Map<string, number>();
    
    // Visit each node and perform validation
    visit(tree, (node: any) => {
      // Validate headings
      if (node.type === 'heading') {
        const headingContent = node.children
          .filter((child: any) => child.type === 'text')
          .map((child: any) => child.value)
          .join('');
        
        // Check for empty headings
        if (!headingContent.trim()) {
          file.message('Heading should not be empty', node, 'markdown-empty-heading')
            .fatal = options.strict;
        }
        
        // Check for duplicate headings
        if (headingContent) {
          if (seenHeadings.has(headingContent)) {
            file.message(`Duplicate heading: "${headingContent}"`, node, 'markdown-duplicate-heading')
              .fatal = false; // Warning only
          } else {
            seenHeadings.set(headingContent, 1);
          }
        }
        
        // Check for proper heading hierarchy (no skipping levels)
        if (node.depth > 1) {
          const prevHeadingLevel = Math.max(...Array.from(seenHeadings.keys())
            .map(heading => {
              const node = tree.children.find((n: any) => 
                n.type === 'heading' && 
                n.children.some((c: any) => c.type === 'text' && c.value === heading)
              );
              return node ? node.depth : 0;
            }));
          
          if (node.depth > prevHeadingLevel + 1) {
            file.message(`Heading level ${node.depth} should not skip levels`, node, 'markdown-heading-hierarchy')
              .fatal = false; // Warning only
          }
        }
      }
      
      // Validate lists
      if (node.type === 'list') {
        // Check for mixed list types
        const isMixedList = node.children.some((item: any, i: number, arr: any[]) => {
          return i > 0 && item.checked !== arr[0].checked && item.checked !== undefined;
        });
        
        if (isMixedList) {
          file.message('List mixes task and non-task items', node, 'markdown-mixed-list')
            .fatal = false; // Warning only
        }
      }
      
      // Validate links
      if (node.type === 'link') {
        // Check for empty links
        if (!node.url) {
          file.message('Link URL should not be empty', node, 'markdown-empty-link')
            .fatal = options.strict;
        }
        
        // Check for empty link text
        if (node.children.length === 0 || 
            (node.children.length === 1 && node.children[0].value === '')) {
          file.message('Link text should not be empty', node, 'markdown-empty-link-text')
            .fatal = options.strict;
        }
      }
      
      // Validate code blocks (GFM specific)
      if (node.type === 'code' && options.spec !== MarkdownSpec.COMMONMARK) {
        // Check if language is specified
        if (!node.lang) {
          file.message('Code block should specify a language', node, 'markdown-code-language')
            .fatal = false; // Warning only
        }
      }
      
      // Validate tables (GFM specific)
      if (node.type === 'table' && options.spec !== MarkdownSpec.COMMONMARK) {
        // Check for empty tables
        if (node.children.length <= 1) {
          file.message('Table should have content rows', node, 'markdown-empty-table')
            .fatal = false; // Warning only
        }
      }
    });
  };
}

/**
 * Parse markdown text and return AST
 */
export function parseMarkdown(markdown: string, options: Partial<ParserOptions> = {}): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const processor = createProcessor(opts);
  const errors: MarkdownError[] = [];
  
  try {
    // Create a virtual file with the markdown content
    const vfile = new VFile({ path: 'content.md', value: markdown });
    
    // Parse the markdown content
    const ast = processor.parse(vfile);
    processor.runSync(ast, vfile);
    
    // Convert VFile messages to our error format
    if (vfile.messages.length > 0) {
      for (const msg of vfile.messages) {
        errors.push({
          line: msg.line || 1,
          column: msg.column || 1,
          message: msg.reason,
          severity: msg.fatal ? 'error' : 'warning',
          rule: msg.ruleId?.toString() || 'markdown-syntax'
        });
      }
    }
    
    return {
      valid: errors.length === 0 || errors.every(err => err.severity !== 'error'),
      errors,
      ast
    };
  } catch (error: any) {
    errors.push({
      line: error.line || 1,
      column: error.column || 1,
      message: error.message || 'Unknown error parsing markdown',
      severity: 'error',
      rule: 'markdown-parser'
    });
    
    return {
      valid: false,
      errors
    };
  }
}

/**
 * Render markdown to HTML
 */
export async function renderMarkdown(markdown: string, options: Partial<ParserOptions> = {}): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Create processor pipeline for markdown -> html
    const processor = unified()
      .use(remarkParse)
      .use(opts.spec === MarkdownSpec.GFM || opts.extendedSyntax ? remarkGfm as any : () => {})
      .use(remarkRehype)
      .use(rehypeStringify);
    
    // Process the markdown
    const vfile = await processor.process(markdown);
    return String(vfile);
  } catch (error: any) {
    console.error('Error rendering markdown:', error);
    return '';
  }
}

/**
 * Compare expected and actual HTML, returning a diff
 */
export function diffHtml(expected: string, actual: string): string {
  // Normalize HTML for comparison (remove whitespace differences)
  const normalizeHtml = (html: string) => {
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedExpected = normalizeHtml(expected);
  const normalizedActual = normalizeHtml(actual);
  
  if (normalizedExpected === normalizedActual) {
    return '';
  }
  
  // Simple character-by-character diff
  let diff = '';
  let i = 0;
  
  while (i < normalizedExpected.length || i < normalizedActual.length) {
    if (i >= normalizedExpected.length) {
      diff += chalk.green(normalizedActual.substring(i));
      break;
    } else if (i >= normalizedActual.length) {
      diff += chalk.red(normalizedExpected.substring(i));
      break;
    } else if (normalizedExpected[i] !== normalizedActual[i]) {
      // Find the end of the difference
      let expectedEnd = i;
      let actualEnd = i;
      
      while (expectedEnd < normalizedExpected.length && 
             (actualEnd >= normalizedActual.length || normalizedExpected[expectedEnd] !== normalizedActual[actualEnd])) {
        expectedEnd++;
      }
      
      while (actualEnd < normalizedActual.length && 
             (expectedEnd >= normalizedExpected.length || normalizedExpected[expectedEnd] !== normalizedActual[actualEnd])) {
        actualEnd++;
      }
      
      diff += chalk.red(normalizedExpected.substring(i, expectedEnd));
      diff += chalk.green(normalizedActual.substring(i, actualEnd));
      
      i = Math.max(expectedEnd, actualEnd);
    } else {
      diff += normalizedExpected[i];
      i++;
    }
  }
  
  return diff;
}

/**
 * Validate a markdown file
 */
export function validateMarkdownFile(filePath: string, options: Partial<ParserOptions> = {}): ValidationResult {
  try {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const result = parseMarkdown(markdown, options);
    
    // Add file path to error messages
    result.errors = result.errors.map(err => ({
      ...err,
      message: `${path.basename(filePath)}:${err.line}:${err.column} - ${err.message}`
    }));
    
    return result;
  } catch (error: any) {
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Error reading file ${filePath}: ${error.message}`,
        severity: 'error',
        rule: 'file-system'
      }]
    };
  }
}

/**
 * Validate all markdown files in a directory
 */
export function validateMarkdownDirectory(dirPath: string, options: Partial<ParserOptions> = {}): ValidationResult[] {
  try {
    const results: ValidationResult[] = [];
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively process subdirectories
        results.push(...validateMarkdownDirectory(filePath, options));
      } else if (stat.isFile() && /\.md$/i.test(file)) {
        // Process markdown files
        results.push(validateMarkdownFile(filePath, options));
      }
    }
    
    return results;
  } catch (error: any) {
    return [{
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Error processing directory ${dirPath}: ${error.message}`,
        severity: 'error',
        rule: 'file-system'
      }]
    }];
  }
}

/**
 * Test if an HTML output matches expected result
 */
export async function testMarkdownRendering(markdown: string, expectedHtml: string, options: Partial<ParserOptions> = {}): Promise<{
  passed: boolean;
  diff: string;
  actualHtml: string;
}> {
  const actualHtml = await renderMarkdown(markdown, options);
  
  // Normalize HTML for comparison
  const normalizeHtml = (html: string) => {
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedExpected = normalizeHtml(expectedHtml);
  const normalizedActual = normalizeHtml(actualHtml);
  const passed = normalizedExpected === normalizedActual;
  
  // Generate diff if test failed
  const diff = passed ? '' : diffHtml(expectedHtml, actualHtml);
  
  return {
    passed,
    diff,
    actualHtml
  };
} 