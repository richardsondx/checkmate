import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import OpenAI from 'openai';

async function test() {
  try {
    // Read the config file
    const configContent = readFileSync('.checkmate', 'utf8');
    const config = parse(configContent);
    
    console.log('Configuration loaded successfully');
    
    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: config.openai_key
    });
    
    console.log('OpenAI client initialized');
    console.log(`Using models: reason=${config.models.reason}, quick=${config.models.quick}`);
    
    // Testing the quick model
    console.log(`\nTesting ${config.models.quick} model...`);
    
    const response = await openai.chat.completions.create({
      model: config.models.quick,
      messages: [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "Reply with 'TEST_SUCCESS' if you're working properly." }
      ],
      max_tokens: 50
    });
    
    const content = response.choices[0].message.content.trim();
    console.log('Response:', content);
    
    if (content.includes('TEST_SUCCESS')) {
      console.log('✅ Test passed! Model integration is working.');
    } else {
      console.log('❌ Test failed. Response does not contain expected text.');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

test(); 