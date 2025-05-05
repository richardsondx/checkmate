/**
 * Markdown validator for CheckMate CLI
 * Validates Markdown syntax and structure according to various specifications
 */
import * as fs from 'node:fs';

// Different Markdown specs supported
export enum MarkdownSpec {
  COMMONMARK = 'commonmark',
  GFM = 'github',
  CHECKMATE = 'checkmate'
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Validation error interface
export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule: string;
}

/**
 * Validate basic Markdown syntax elements
 */
export function validateBasicSyntax(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  // Check headings (# Heading)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check headings format
    if (line.startsWith('#')) {
      if (!line.match(/^#{1,6}\s+.+$/)) {
        errors.push({
          line: i + 1,
          column: 1,
          message: 'Heading should have a space after # and content',
          severity: 'error',
          rule: 'heading-format'
        });
      }
    }
    
    // Check for bold and italic without spaces
    const boldWithoutSpace = line.match(/\*\*([^\s*])/g);
    if (boldWithoutSpace) {
      errors.push({
        line: i + 1,
        column: line.indexOf(boldWithoutSpace[0]) + 1,
        message: 'Bold text should have a space after opening **',
        severity: 'warning',
        rule: 'bold-format'
      });
    }
    
    // Check for list items without proper format
    if (line.match(/^\s*[-*+]\S/)) {
      errors.push({
        line: i + 1,
        column: line.indexOf('-') + 1,
        message: 'List items should have a space after the bullet',
        severity: 'error',
        rule: 'list-format'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate code blocks in Markdown
 */
export function validateCodeBlocks(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeBlockLanguage = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for code block start
    if (line.match(/^```([a-zA-Z0-9]*)/)) {
      if (inCodeBlock) {
        errors.push({
          line: i + 1,
          column: 1,
          message: 'Nested code blocks are not allowed',
          severity: 'error',
          rule: 'code-block-nesting'
        });
      } else {
        inCodeBlock = true;
        codeBlockStart = i;
        const match = line.match(/^```([a-zA-Z0-9]*)/);
        codeBlockLanguage = match ? match[1] : '';
        
        // Warn if language is not specified
        if (!codeBlockLanguage) {
          errors.push({
            line: i + 1,
            column: 4,
            message: 'Code block should specify a language',
            severity: 'warning',
            rule: 'code-block-language'
          });
        }
      }
    }
    
    // Check for code block end
    if (line.match(/^```\s*$/) && inCodeBlock) {
      inCodeBlock = false;
      
      // Check for empty code blocks
      if (i - codeBlockStart <= 1) {
        errors.push({
          line: codeBlockStart + 1,
          column: 1,
          message: 'Empty code blocks are not recommended',
          severity: 'warning',
          rule: 'code-block-empty'
        });
      }
    }
  }
  
  // Check for unclosed code blocks
  if (inCodeBlock) {
    errors.push({
      line: codeBlockStart + 1,
      column: 1,
      message: 'Unclosed code block',
      severity: 'error',
      rule: 'code-block-unclosed'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Markdown links
 */
export function validateLinks(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  // Regex for links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    while ((match = linkRegex.exec(line)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Check for empty link text
      if (!linkText.trim()) {
        errors.push({
          line: i + 1,
          column: match.index + 1,
          message: 'Link text should not be empty',
          severity: 'error',
          rule: 'link-text-empty'
        });
      }
      
      // Check for empty link URL
      if (!linkUrl.trim()) {
        errors.push({
          line: i + 1,
          column: match.index + linkText.length + 3,
          message: 'Link URL should not be empty',
          severity: 'error',
          rule: 'link-url-empty'
        });
      }
      
      // Check for properly formatted URLs
      if (linkUrl.trim() && !linkUrl.match(/^(https?:\/\/|mailto:|#|\/|\.\.?\/)/)) {
        errors.push({
          line: i + 1,
          column: match.index + linkText.length + 3,
          message: 'Link URL should be properly formatted',
          severity: 'warning',
          rule: 'link-url-format'
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Markdown tables
 */
export function validateTables(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line might be a table row
    if (line.includes('|')) {
      // Check if it's a header separator row (| --- | --- |)
      if (line.match(/\|[\s\-:]+\|/)) {
        // Check if it has the proper alignment markers
        if (!line.match(/\|[\s]*(:?-+:?[\s]*\|)+/)) {
          errors.push({
            line: i + 1,
            column: 1,
            message: 'Table header separator should have dashes with optional alignment colons',
            severity: 'error',
            rule: 'table-separator-format'
          });
        }
        
        // Check if there's a header row above
        if (i === 0 || !lines[i - 1].includes('|')) {
          errors.push({
            line: i + 1,
            column: 1,
            message: 'Table separator row should have a header row above it',
            severity: 'error',
            rule: 'table-missing-header'
          });
        } else {
          // Check if header and separator have the same number of columns
          const headerCols = (lines[i - 1].match(/\|/g) || []).length;
          const separatorCols = (line.match(/\|/g) || []).length;
          
          if (headerCols !== separatorCols) {
            errors.push({
              line: i + 1,
              column: 1,
              message: 'Table header and separator should have the same number of columns',
              severity: 'error',
              rule: 'table-column-mismatch'
            });
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate nested Markdown structures
 */
export function validateNestedStructures(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  let listIndentation = 0;
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const indentation = line.length - trimmedLine.length;
    
    // Check list items
    if (trimmedLine.match(/^[-*+]\s/)) {
      if (!inList) {
        inList = true;
        listIndentation = indentation;
      } else {
        // Check for consistent indentation
        if (indentation > listIndentation && (indentation - listIndentation) % 2 !== 0) {
          errors.push({
            line: i + 1,
            column: 1,
            message: 'Nested list indentation should be consistent (typically 2 or 4 spaces)',
            severity: 'warning',
            rule: 'list-indentation'
          });
        }
      }
    } else if (trimmedLine === '' && inList) {
      // Empty line resets list context
      inList = false;
    }
    
    // Check blockquotes with nested elements
    if (trimmedLine.startsWith('> ')) {
      // Check for nested blockquote markup
      if (trimmedLine.match(/^>\s+>\s/)) {
        const nestedContent = trimmedLine.substring(trimmedLine.indexOf('> > ') + 4);
        
        // Check for proper formatting in nested blockquotes
        if (nestedContent.match(/^[-*+]\s/) && !nestedContent.match(/^[-*+]\s+/)) {
          errors.push({
            line: i + 1,
            column: trimmedLine.indexOf('> > ') + 4,
            message: 'Nested list in blockquote should have proper spacing',
            severity: 'warning',
            rule: 'blockquote-nested-list'
          });
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Verify compliance with a specific Markdown specification
 */
export function verifySpecCompliance(content: string, spec: MarkdownSpec = MarkdownSpec.COMMONMARK): ValidationResult {
  // Start with basic validation
  const basicSyntaxResult = validateBasicSyntax(content);
  const codeBlocksResult = validateCodeBlocks(content);
  const linksResult = validateLinks(content);
  const tablesResult = validateTables(content);
  const nestedStructuresResult = validateNestedStructures(content);
  
  // Combine all results
  const allErrors = [
    ...basicSyntaxResult.errors,
    ...codeBlocksResult.errors,
    ...linksResult.errors,
    ...tablesResult.errors,
    ...nestedStructuresResult.errors
  ];
  
  // Add spec-specific checks
  if (spec === MarkdownSpec.GFM) {
    // Check GitHub Flavored Markdown specific features (tables, strikethrough, etc.)
    const gfmChecks = checkGFMCompliance(content);
    allErrors.push(...gfmChecks.errors);
  } else if (spec === MarkdownSpec.CHECKMATE) {
    // Check CheckMate specific Markdown requirements
    const checkmateChecks = checkCheckmateCompliance(content);
    allErrors.push(...checkmateChecks.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Check GitHub Flavored Markdown compliance
 */
function checkGFMCompliance(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  // Check for GFM-specific features like task lists, etc.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check task list items
    if (line.match(/^\s*[-*+]\s+\[ \]\s/)) {
      // This is fine, it's a valid task list format
    } else if (line.match(/^\s*[-*+]\s+\[[^\]x]\]\s/)) {
      errors.push({
        line: i + 1,
        column: 1,
        message: 'Task list checkbox should contain either a space or "x"',
        severity: 'error',
        rule: 'gfm-tasklist-format'
      });
    }
    
    // Check strikethrough format
    const strikethroughMatch = line.match(/~~[^~]*~~/);
    if (strikethroughMatch && !line.match(/~~[^~]+~~/)) {
      errors.push({
        line: i + 1,
        column: line.indexOf(strikethroughMatch[0]) + 1,
        message: 'Strikethrough should have content between delimiters',
        severity: 'warning',
        rule: 'gfm-strikethrough-format'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check CheckMate specific Markdown compliance
 */
function checkCheckmateCompliance(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');
  
  // Check for CheckMate-specific requirements
  let hasTitle = false;
  let hasFiles = false;
  let hasRequirements = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for title (# Feature: ...)
    if (line.match(/^# (?:Feature: )?/)) {
      hasTitle = true;
    }
    
    // Check for files section
    if (line.match(/^## Files/)) {
      hasFiles = true;
    }
    
    // Check for requirements section
    if (line.match(/^## Requirements/)) {
      hasRequirements = true;
    }
    
    // Check for proper requirement format (checkbox)
    if (hasRequirements && line.match(/^\s*[-*+]\s+\[\s*\]/) && !line.match(/^\s*[-*+]\s+\[ \]/)) {
      errors.push({
        line: i + 1,
        column: 1,
        message: 'CheckMate requirements should use "[ ]" format with a space inside',
        severity: 'error',
        rule: 'checkmate-requirement-format'
      });
    }
  }
  
  // Check for required sections
  if (!hasTitle) {
    errors.push({
      line: 1,
      column: 1,
      message: 'CheckMate spec must have a title (# Feature: ...)',
      severity: 'error',
      rule: 'checkmate-missing-title'
    });
  }
  
  if (!hasFiles) {
    errors.push({
      line: 1,
      column: 1,
      message: 'CheckMate spec must have a Files section (## Files)',
      severity: 'error',
      rule: 'checkmate-missing-files'
    });
  }
  
  if (!hasRequirements) {
    errors.push({
      line: 1,
      column: 1,
      message: 'CheckMate spec must have a Requirements section (## Requirements)',
      severity: 'error',
      rule: 'checkmate-missing-requirements'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a Markdown file
 */
export function validateMarkdownFile(filePath: string, spec: MarkdownSpec = MarkdownSpec.COMMONMARK): ValidationResult {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return verifySpecCompliance(content, spec);
  } catch (error) {
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Error reading file: ${error}`,
        severity: 'error',
        rule: 'file-access'
      }]
    };
  }
} 