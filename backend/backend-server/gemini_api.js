const axios = require('axios');

async function callGenerativeAI(question, prompt, apiKey) {
  try {
    const response = await axios.post('https://api.gemini.ai/v1/generate', {
      model: 'gemini-pro',
      prompt: prompt,
      question: question,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.generated_text) {
      return { text: response.data.generated_text };
    } else {
      throw new Error('Unexpected response structure');
    }
  } catch (error) {
    console.error(`Failed to call Generative AI: ${error.message}`);
    if (error.response) {
      console.error(`Error response: ${error.response.data}`);
    }
    throw new Error(`Failed to call Generative AI: ${error.message}`);
  }
}

module.exports = { callGenerativeAI };
