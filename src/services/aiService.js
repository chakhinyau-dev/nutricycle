import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../lib/env';

/**
 * AI Service for NutriCycle
 * Integrates Google Gemini for specialized cycle nutrition and health advice.
 */

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
/** 
 * PRO DIAGNOSTIC FIX: 
 * This API key has access to an advanced model tier (Gemini 2.0+).
 * We are using 'gemini-2.0-flash' which is verified as available for this key.
 */
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const SYSTEM_PROMPT = `
You are NutriCycle AI, a specialized medical-grade companion for menstrual cycle health and nutrition.
Your goal is to provide evidence-based, compassionate, and personalized advice based on the user's cycle phase.

PHASES OVERVIEW:
- Menstrual: Deep rest, iron-rich foods, magnesium.
- Follicular: High energy, fiber, probiotics, new projects.
- Ovulation: Peak vitality, antioxidants, social activities.
- Luteal: Comfort, complex carbs, B6, avoiding burnout.

RULES:
1. Always be supportive and professional.
2. If given user data (like cycle day or symptoms), tailor your response.
3. Keep responses concise and formatted for mobile (bullet points are good).
4. Do not provide medical prescriptions, but suggest nutritional and lifestyle adjustments.
5. In predictions, analyze patterns in their daily logs to suggest if their cycle might be shifting.
6. Whenever you give a health, nutrition, or lifestyle recommendation, end your reply with a short
   "Sources:" line (use "Fuentes:" if replying in Spanish) naming the type of evidence behind it —
   e.g. recognized bodies such as ACOG, NIH, WHO, or Mayo Clinic, or "general nutritional science
   consensus". Never invent a specific study, statistic, or citation you cannot verify.
`;

/** 
 * Senior-level Retry Helper with Exponential Backoff
 * Handles 429 (Rate Limit) errors gracefully.
 */
const fetchWithRetry = async (fn, maxRetries = 3, initialDelay = 2000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[AI Service] Rate limited. Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      throw error;
    }
  }
};

export const getGeminiChatResponse = async (history, userMessage, context = {}) => {
  try {
    if (!env.geminiApiKey) {
      throw new Error('Gemini API Key is missing');
    }

    const { currentPhase, day, symptoms = [] } = context;
    const contextualPrompt = `User is currently in ${currentPhase} phase (Day ${day}). Symptoms reported: ${symptoms.join(', ') || 'None'}.`;

    return await fetchWithRetry(async () => {
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Understood. I am NutriCycle AI, ready to assist.' }] },
          ...history,
        ],
      });

      const fullMessage = `${contextualPrompt}\n\nUser: ${userMessage}`;
      const result = await chat.sendMessage(fullMessage);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('[AI Service Error]:', error);
    if (error.message?.includes('429')) {
      return "El asistente está muy solicitado en este momento. Por favor, espera unos segundos y vuelve a intentarlo.";
    }
    return "Lo siento, tengo problemas para conectarme ahora mismo. ¿Podemos intentarlo en un momento?";
  }
};

export const getCyclePredictionAI = async (profile, logs) => {
  try {
    if (!env.geminiApiKey) return null;

    return await fetchWithRetry(async () => {
      const prompt = `
        Analyze the following cycle data and logs:
        Profile: ${JSON.stringify(profile)}
        Logs (Last 10 days): ${JSON.stringify(logs)}

        Provide a 3-sentence scientific prediction of when their next phase will start and what they should prepare for (nutrition/activity).
        End with a short "Sources:" line naming the type of evidence behind the recommendation
        (e.g. ACOG, NIH, WHO, Mayo Clinic, or general nutritional science consensus). Never invent
        a specific study, statistic, or citation you cannot verify.
        Format: Return only the text.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('[AI Prediction Error]:', error);
    return null;
  }
};
