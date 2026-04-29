const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testV25() {
  const apiKey = 'AIzaSyDZo_HE2Jst2iaHPWSbf36-9e9LsUUIbAQ';
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
     console.log(`--- Testing gemini-2.5-flash ---`);
     const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
     const result = await model.generateContent('Hi');
     console.log(`Success:`, result.response.text());
  } catch (e) {
     console.error(`Failed:`, e.message);
  }
}

testV25();
