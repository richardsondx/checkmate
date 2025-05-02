import OpenAI from 'openai';

async function test() {
  try {
    const openai = new OpenAI({
      apiKey: config.openai_key
    });

    console.log('OpenAI client initialized successfully');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, AI!" }
      ],
      max_tokens: 50
    });

    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

test(); 