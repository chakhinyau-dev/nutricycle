const { GoogleGenerativeAI } = require('@google/generative-ai');

async function diagnose() {
  const apiKey = 'AIzaSyDZo_HE2Jst2iaHPWSbf36-9e9LsUUIbAQ';
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log('--- Testing Gemini Pro ---');
    const proModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const proResult = await proModel.generateContent('Hi');
    console.log('Gemini Pro Success:', proResult.response.text());
  } catch (e) {
    console.error('Gemini Pro Failed:', e.message);
  }

  try {
    console.log('\n--- Testing Gemini 1.5 Flash ---');
    const flashModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const flashResult = await flashModel.generateContent('Hi');
    console.log('Gemini 1.5 Flash Success:', flashResult.response.text());
  } catch (e) {
    console.error('Gemini 1.5 Flash Failed:', e.message);
  }
}

diagnose();
