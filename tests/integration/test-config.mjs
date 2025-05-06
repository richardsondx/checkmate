import { readFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';

// Read the config file
try {
  const configContent = readFileSync('.checkmate', 'utf8');
  console.log('Raw config file content:');
  console.log(configContent);
  
  // Try to parse it
  try {
    const configObj = parse(configContent);
    console.log('\nParsed config:');
    console.log(JSON.stringify(configObj, null, 2));
    
    // Verify specific fields
    console.log('\nVerification:');
    console.log('API Key present:', Boolean(configObj.openai_key));
    console.log('Reason model:', configObj.models?.reason || 'not found');
    console.log('Quick model:', configObj.models?.quick || 'not found');
  } catch (parseErr) {
    console.error('Error parsing YAML:', parseErr);
  }
} catch (fileErr) {
  console.error('Error reading config file:', fileErr);
} 