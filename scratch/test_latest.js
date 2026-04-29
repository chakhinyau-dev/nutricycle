const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testLatestModels() {
  const apiKey = 'AIzaSyDZo_HE2Jst2iaHPWSbf36-9e9LsUUIbAQ';
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-flash-latest', 'gemini-pro-latest'];

  for (const mName of models) {
     try {
        console.log(`--- Testing ${mName} ---`);
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent('Hi');
        console.log(`${mName} Success:`, result.response.text());
     } catch (e) {
        console.error(`${mName} Failed:`, e.message);
     }
  }
}

testLatestModels();
