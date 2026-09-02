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

/**
 * Builds the grounding block sent with every chat message. Previously this
 * was just phase + day + whatever symptoms the user happened to type in
 * *this* message — everything else the app already knows about the user
 * (their actual cycle settings, recent mood/energy/symptom history, what
 * they've actually logged eating) was simply never sent, so the model had
 * nothing real to reference and could only speak in generalities. This pulls
 * in the profile data and recent logs the rest of the app already has, and
 * explicitly forbids the model from inventing anything not present here.
 */
const buildContextBlock = (context) => {
  const {
    currentPhase,
    day,
    userName,
    cycleLength,
    periodLength,
    recentLogs = [],
    recentMeals = [],
    symptoms = [],
  } = context;

  const logsBlock = recentLogs.length
    ? recentLogs
        .map((l) => `- ${l.date}: mood=${l.mood || 'n/a'}, energy=${l.energyLevel || 'n/a'}, symptoms=${(l.symptoms || []).join(', ') || 'none'}`)
        .join('\n')
    : 'No recent daily logs recorded.';

  const mealsBlock = recentMeals.length
    ? recentMeals
        .map((m) => `- ${m.date}: ${m.items.join(', ') || 'unnamed items'} — ${m.calories} kcal, ${m.protein}g protein, ${m.carbs}g carbs, ${m.fat}g fat`)
        .join('\n')
    : 'No meals logged recently.';

  return `
User profile:
- Name: ${userName || 'User'}
- Current phase: ${currentPhase || 'unknown'} (cycle day ${day ?? 'unknown'})
- Typical cycle length: ${cycleLength || 'unknown'} days · typical period length: ${periodLength || 'unknown'} days

Recent daily logs (most recent first):
${logsBlock}

Recently logged meals (most recent first):
${mealsBlock}

Symptoms mentioned in this specific message: ${symptoms.join(', ') || 'None'}

IMPORTANT: Only reference specific numbers, dates, or facts that actually appear above or earlier in this
conversation. Never invent a statistic, measurement, or logged value the user was not actually given credit for —
if something isn't in this data, say you don't have that information instead of guessing.
`;
};

/**
 * Gemini's startChat requires history to strictly alternate user/model turns
 * (a repeated role back-to-back gets the whole request rejected with a 400).
 * The seeded pair below (SYSTEM_PROMPT as 'user', the ack as 'model') assumes
 * the next turn is 'user' — true in the normal case, but a saved chat history
 * loaded from the DB can violate that: a 'model' save that fails to persist
 * after its paired 'user' one succeeded leaves a dangling unanswered turn,
 * and either that or the 20-message load window / 30-day cron cleanup can
 * land such that the oldest kept row is a 'model' reply. Rather than trust
 * the caller's history is clean, rebuild it keeping only turns that actually
 * continue the alternation, starting from 'user' — dropping an occasional
 * turn beats a hard failure that silently breaks the whole chat.
 */
const sanitizeHistoryForGemini = (rawHistory) => {
  const cleaned = [];
  for (const turn of rawHistory) {
    if (!turn?.role || !turn?.parts) continue;
    const prev = cleaned[cleaned.length - 1];
    if (!prev) {
      if (turn.role !== 'user') continue;
    } else if (prev.role === turn.role) {
      continue;
    }
    cleaned.push(turn);
  }
  return cleaned;
};

export const getGeminiChatResponse = async (history, userMessage, context = {}) => {
  try {
    if (!env.geminiApiKey) {
      throw new Error('Gemini API Key is missing');
    }

    const contextualPrompt = buildContextBlock(context);
    const safeHistory = sanitizeHistoryForGemini(history);

    return await fetchWithRetry(async () => {
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Understood. I am NutriCycle AI, ready to assist.' }] },
          ...safeHistory,
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
