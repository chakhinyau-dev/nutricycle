const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkSpecificModels() {
  const apiKey = 'AIzaSyDZo_HE2Jst2iaHPWSbf36-9e9LsUUIbAQ';
  
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  for (const model of modelsToTry) {
     try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`);
        if (response.ok) {
           console.log(`✅ Model ${model} is VALID`);
        } else {
           console.log(`❌ Model ${model} returned ${response.status}`);
        }
     } catch (e) {
        console.log(`❌ Model ${model} failed: ${e.message}`);
     }
  }
}

checkSpecificModels();
