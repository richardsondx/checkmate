/**
 * CheckMate Spec Naming Convention Rule
 * 
 * This rule ensures that all spec files in the checkmate/specs directory
 * follow the proper naming convention:
 * - Slugified from feature titles
 * - All lowercase
 * - Hyphens instead of spaces
 * - No numbers at beginning (unless part of feature name)
 * - No special characters
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce proper naming convention for CheckMate spec files',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [], // no options
  },
  create(context) {
    return {
      Program(node) {
        const filePath = context.getFilename();
        
        // Only apply to markdown files in the specs directory
        if (!filePath.includes('checkmate/specs/') || !filePath.endsWith('.md')) {
          return;
        }
        
        // Get the filename without path and extension
        const filename = filePath.split('/').pop().replace('.md', '');
        
        // Check if the filename starts with a number followed by a dash
        // This pattern suggests it's not derived from a feature title (like "1-overview.md")
        const numberPrefixPattern = /^[0-9]+-/;
        
        if (numberPrefixPattern.test(filename)) {
          context.report({
            node,
            message: 'Spec filename should be derived from feature title, not document section numbers (e.g., "spec-generator.md" not "1-overview.md")',
            loc: { line: 1, column: 0 }
          });
          return;
        }
        
        // Check if the filename is properly slugified
        const properSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        
        if (!properSlugPattern.test(filename)) {
          context.report({
            node,
            message: 'Spec filename should be properly slugified (lowercase, hyphens instead of spaces, no special characters)',
            loc: { line: 1, column: 0 }
          });
          return;
        }
        
        // Check the first line of the file to ensure it matches the expected format
        const sourceCode = context.getSourceCode().getText();
        const firstLine = sourceCode.split('\n')[0];
        
        // The first line should be "# Feature: Title" or "# Title"
        if (!firstLine.startsWith('# ')) {
          context.report({
            node,
            message: 'Spec file should start with a level 1 heading (# Feature Title)',
            loc: { line: 1, column: 0 }
          });
          return;
        }
        
        // Check that a "## Checks" section exists
        if (!sourceCode.includes('## Checks')) {
          context.report({
            node,
            message: 'Spec file must contain a "## Checks" section with acceptance criteria',
            loc: { line: 1, column: 0 }
          });
          return;
        }
      }
    };
  },
}; 