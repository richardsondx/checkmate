/**
 * Auto-file discovery for CheckMate
 * Automatically detects and tracks relevant files for specs
 */
import fs from 'node:fs';
import path from 'node:path';
import { listSpecs, getSpecByName, parseSpec } from './specs.js';
import { buildContext } from './context.js';
import { createHash } from 'node:crypto';
import yaml from 'yaml';

/**
 * File metadata interface
 */
interface FileMeta {
  files_auto: boolean;
  domain?: string;
  file_hashes: Record<string, string>;
}

/**
 * Add meta block to a spec file
 * @param specPath Path to the spec file
 * @param enableAutoFiles Whether to enable auto file discovery
 */
export async function addMetaToSpec(specPath: string, enableAutoFiles: boolean = true): Promise<void> {
  try {
    // Check if specPath is a valid file path - if it starts with '{' it's likely JSON content
    if (specPath.trim().startsWith('{')) {
      console.warn('Warning: Received JSON content instead of a file path. Skipping meta block addition.');
      return;
    }

    // Check if the file exists before trying to read it
    if (!fs.existsSync(specPath)) {
      console.warn(`Warning: Spec file does not exist: ${specPath}`);
      return;
    }
    
    // Read the spec file
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Parse the spec
    const spec = await parseSpec(specPath);
    
    // Generate hashes for the current files
    const fileHashes: Record<string, string> = {};
    
    for (const file of spec.files || []) {
      try {
        if (fs.existsSync(file)) {
          const fileContent = fs.readFileSync(file, 'utf8');
          const hash = createHash('md5').update(fileContent.slice(0, 1000)).digest('hex');
          fileHashes[file] = hash;
        }
      } catch (error) {
        console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    // Check if file is markdown or yaml
    if (specPath.endsWith('.md')) {
      // Check if the Files section already exists
      if (!/^## Files/m.test(content)) {
        // Extract files from content as well
        const filePaths = Object.keys(fileHashes);
        
        // We need to add a Files section after the Checks section
        const checksIndex = content.indexOf('## Checks');
        if (checksIndex !== -1) {
          // Find the next section after Checks
          const nextSectionMatch = content.slice(checksIndex + 9).match(/^##\s/m);
          const insertPosition = nextSectionMatch && nextSectionMatch.index !== undefined
            ? checksIndex + 9 + nextSectionMatch.index 
            : content.length;
          
          // Generate Files section content
          const filesSection = `\n\n## Files\n${filePaths.map(file => `- ${file}`).join('\n')}\n`;
          
          // Insert the Files section
          const newContent = 
            content.slice(0, insertPosition) + 
            filesSection + 
            content.slice(insertPosition);
          
          fs.writeFileSync(specPath, newContent, 'utf8');
        } else {
          // If no Checks section, just append to the end
          const filesSection = `\n\n## Files\n${Object.keys(fileHashes).map(file => `- ${file}`).join('\n')}\n`;
          fs.writeFileSync(specPath, content + filesSection, 'utf8');
        }
      }
      
      // No longer add meta section for markdown files
      // const metaYaml = yaml.stringify({ meta });
      // const metaComment = `\n\n<!-- meta:\n${metaYaml}-->\n`;
      
      // // Check if meta block already exists
      // if (content.includes('<!-- meta:')) {
      //   // Replace existing meta block
      //   const newContent = content.replace(/<!-- meta:[\s\S]*?-->/, metaComment);
      //   fs.writeFileSync(specPath, newContent, 'utf8');
      // } else {
      //   // Add meta block at the end
      //   fs.writeFileSync(specPath, content + metaComment, 'utf8');
      // }
    } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      // For YAML file, parse and add meta field
      const yamlDoc = yaml.parse(content);
      yamlDoc.meta = {
        files_auto: enableAutoFiles,
        file_hashes: fileHashes
      };
      fs.writeFileSync(specPath, yaml.stringify(yamlDoc), 'utf8');
    }
  } catch (error) {
    console.error(`Error adding files section to spec ${specPath}:`, error);
  }
}

/**
 * Update files for a spec using auto-discovery
 * @param specPath Path to the spec file
 */
export async function updateAutoFiles(specPath: string): Promise<string[]> {
  // Safety check for invalid paths
  if (!specPath || typeof specPath !== 'string' || specPath.trim().startsWith('{') || !fs.existsSync(specPath)) {
    console.warn(`Cannot update auto-files for invalid spec path: ${specPath}`);
    return [];
  }
  
  try {
    // Read the spec file
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Parse the spec
    const spec = await parseSpec(specPath);
    
    // Extract spec attributes for context building
    const featureStub = {
      title: spec.title,
      slug: path.basename(specPath, path.extname(specPath)),
      description: spec.checks?.map(c => c.text).join(' ') || ''
    };
    
    // Build context to find relevant files
    const context = await buildContext(featureStub, false);
    
    // Get the top 20 most relevant files
    const newFiles = context
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20)
      .map(c => c.path);
    
    // Get old files for comparison
    const oldFiles = spec.files || [];
    
    // Create hash map of new files
    const fileHashes: Record<string, string> = {};
    for (const file of newFiles) {
      try {
        if (fs.existsSync(file)) {
          const fileContent = fs.readFileSync(file, 'utf8');
          const hash = createHash('md5').update(fileContent.slice(0, 1000)).digest('hex');
          fileHashes[file] = hash;
        }
      } catch (error) {
        console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    // Create meta block
    const meta: FileMeta = {
      files_auto: true,
      file_hashes: fileHashes
    };
    
    // Update the spec file with the new files and meta
    if (specPath.endsWith('.md')) {
      // For markdown, update the files section and meta block
      let newContent = content;
      
      // Update files section
      const filesRegex = /files:[\s\S]*?(?=\n\n|\n#)/;
      const filesSection = `files:\n${newFiles.map(f => `- ${f}`).join('\n')}`;
      
      if (newContent.match(filesRegex)) {
        newContent = newContent.replace(filesRegex, filesSection);
      }
      
      // Update meta block
      const metaYaml = yaml.stringify({ meta });
      const metaComment = `\n\n<!-- meta:\n${metaYaml}-->\n`;
      
      if (newContent.includes('<!-- meta:')) {
        newContent = newContent.replace(/<!-- meta:[\s\S]*?-->/, metaComment);
      } else {
        newContent = newContent + metaComment;
      }
      
      fs.writeFileSync(specPath, newContent, 'utf8');
    } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      // For YAML, parse and update file list and meta
      const yamlDoc = yaml.parse(content);
      yamlDoc.files = newFiles;
      yamlDoc.meta = meta;
      fs.writeFileSync(specPath, yaml.stringify(yamlDoc), 'utf8');
    }
    
    return newFiles;
  } catch (error) {
    console.error(`Error updating auto-files for spec ${specPath}:`, error);
    return [];
  }
}

/**
 * Check if a spec has auto-file discovery enabled
 * @param specPath Path to the spec file
 */
export function hasAutoFileDiscovery(specPath: string): boolean {
  // Safety check for invalid paths
  if (!specPath || typeof specPath !== 'string' || specPath.trim().startsWith('{') || !fs.existsSync(specPath)) {
    return false;
  }
  
  try {
    // Read the spec file
    const content = fs.readFileSync(specPath, 'utf8');
    
    // Check if it's markdown with a meta block
    if (specPath.endsWith('.md')) {
      const metaMatch = content.match(/<!-- meta:([\s\S]*?)-->/);
      if (metaMatch) {
        const metaYaml = metaMatch[1];
        const meta = yaml.parse(metaYaml);
        return meta.meta?.files_auto === true;
      }
    } 
    // Check if it's yaml with a meta field
    else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      const yamlDoc = yaml.parse(content);
      return yamlDoc.meta?.files_auto === true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking auto-file discovery for spec ${specPath}:`, error);
    return false;
  }
}

/**
 * Enable auto-file discovery for all specs in the project
 */
export async function enableAutoFilesForAllSpecs(): Promise<void> {
  try {
    const specs = listSpecs();
    console.log(`Found ${specs.length} specs to process`);
    
    for (const spec of specs) {
      // Check if spec is a valid path before processing
      if (typeof spec === 'string' && spec.trim() && !spec.startsWith('{') && fs.existsSync(spec)) {
        await addMetaToSpec(spec, true);
        console.log(`Enabled auto-file discovery for ${spec}`);
      } else {
        console.warn(`Skipping invalid spec path: ${spec}`);
      }
    }
  } catch (error) {
    console.error('Error enabling auto-files for all specs:', error);
  }
}

/**
 * Update files for all specs with auto-file discovery enabled
 */
export async function updateAllAutoFiles(): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  
  try {
    const specs = listSpecs();
    console.log(`Found ${specs.length} specs to process for auto-file updates`);
    
    for (const spec of specs) {
      // Check if spec is a valid path before processing
      if (typeof spec === 'string' && spec.trim() && !spec.startsWith('{') && fs.existsSync(spec)) {
        if (hasAutoFileDiscovery(spec)) {
          const newFiles = await updateAutoFiles(spec);
          results[spec] = newFiles;
          console.log(`Updated auto-files for ${spec}`);
        }
      } else {
        console.warn(`Skipping invalid spec path: ${spec}`);
      }
    }
  } catch (error) {
    console.error('Error updating auto-files for all specs:', error);
  }
  
  return results;
} 