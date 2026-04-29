const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = 'AIzaSyDZo_HE2Jst2iaHPWSbf36-9e9LsUUIbAQ';
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    // Only print the names of the models
    const names = data.models.map(m => m.name);
    console.log('Valid Model Names:', names);
  } catch (e) {
    console.error('List Models Failed:', e.message);
  }
}

listModels();
