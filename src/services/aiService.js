import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../lib/env';

/**
 * AI Service for NutriCycle
 * Integrates Google Gemini for specialized cycle nutrition and health advice.
 */

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
// gemini-2.0-flash was retired by Google (calls started failing with a 404
// telling callers to move to gemini-3.6-flash) — confirmed via a real
// end-to-end test call against the live API, not just documentation.
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

// Rewritten per client feedback: the previous prompt produced a stiff,
// "sharing knowledge" lecture tone. This one explicitly asks for a casual,
// warm, friend-to-friend voice, keeps every answer framed around the fact
// that this app is exclusively for people who menstruate (not generic
// wellness advice), and forbids markdown syntax outright — Gemini kept
// producing **bold** and "* bullet" markdown, which rendered as literal
// asterisks in the plain <Text> chat bubble (there's no markdown renderer
// in AIChatScreen.js). stripMarkdownArtifacts() below is a safety net for
// whatever slips through anyway.
const SYSTEM_PROMPT = `
You are NutriCycle AI — the user's warm, witty, straight-talking friend who happens to know a lot
about menstrual cycles and nutrition. You are NOT a doctor and you should never sound like one.

CONTEXT: This app is exclusively for people who menstruate, tracking their own cycle. Every response
should be framed specifically through that lens — hormones, cycle phase, the specific symptoms that
come with it — like you actually get this experience, not generic wellness advice that could apply
to anyone.

PHASES OVERVIEW:
- Menstrual: Deep rest, iron-rich foods, magnesium.
- Follicular: High energy, fiber, probiotics, new projects.
- Ovulation: Peak vitality, antioxidants, social activities.
- Luteal: Comfort, complex carbs, B6, avoiding burnout.

VOICE:
- Talk like you're texting a close friend, not writing a pamphlet: casual, warm, a little playful or
  funny when it fits naturally (period cravings, cramps, and mood swings are relatable, not clinical
  case studies). Use contractions and everyday language.
- Validate how she's feeling before jumping straight to advice.
- Write in short, flowing sentences and natural paragraphs — never headers, never numbered lists with
  symbols, and never markdown formatting of any kind. No asterisks (*) anywhere in your response, not
  for emphasis and not for bullet points. If you want to list a few things, either write them as one
  natural sentence or start each line with a plain dash "-", never "*".

RULES:
1. Be supportive like a friend who's got her back — never cold, clinical, or preachy.
2. If given user data (cycle day, symptoms, logs), actually use it to make the reply specific to her.
3. Keep replies short and easy to read on a phone.
4. Never prescribe medication — suggest food or lifestyle tweaks instead, framed casually.
5. If her logs show a pattern, mention it in a friendly, non-alarming way.
6. End with a brief, low-key "Sources:" line (use "Fuentes:" in Spanish) naming the type of evidence —
   e.g. ACOG, NIH, WHO, Mayo Clinic, or general nutrition science consensus. Never invent a specific
   study, statistic, or citation you can't verify. Keep this line short so it doesn't feel like a
   citation in an academic paper.
`;

/**
 * Gemini keeps producing markdown (bold **text**, "* " bullets, occasional
 * headers) even when told not to — this is a plain-text chat bubble with no
 * markdown renderer, so that syntax was showing up as literal asterisks.
 * Strips it as a safety net on top of the system prompt's instruction.
 */
const stripMarkdownArtifacts = (text) => {
  if (!text) return text;
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[ \t]*\*[ \t]+/gm, '- ')
    .replace(/^#{1,6}[ \t]*/gm, '')
    .replace(/\*/g, '');
};

/** 
 * Senior-level Retry Helper with Exponential Backoff
 * Handles 429 (rate limit) and 503 (model overloaded) errors gracefully —
 * confirmed via a real live call that 503 "high demand" responses (Google's
 * own message: "usually temporary") were previously falling straight
 * through to the generic fallback text instead of being retried, since only
 * 429 was ever checked here.
 */
const fetchWithRetry = async (fn, maxRetries = 3, initialDelay = 2000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable =
        error.message?.includes('429') || error.status === 429 ||
        error.message?.includes('503') || error.status === 503;
      if (isRetryable && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[AI Service] Retryable error (429/503). Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
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

/**
 * Streams the reply instead of waiting for the whole thing and dumping it
 * on screen at once — per client feedback that replies "appear suddenly all
 * at once". Calls onChunk(accumulatedTextSoFar) as each piece of the
 * response arrives, so the caller can update one message bubble in place;
 * still returns the final full text (already markdown-stripped) so it can
 * be persisted once streaming finishes. onChunk is called at least once
 * even on failure, with the fallback text, so the UI's "wait for first
 * chunk, then show the bubble" logic works the same on the error path.
 */
export const streamGeminiChatResponse = async (history, userMessage, context = {}, onChunk) => {
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
      const result = await chat.sendMessageStream(fullMessage);

      let accumulated = '';
      for await (const chunk of result.stream) {
        accumulated += chunk.text();
        onChunk?.(stripMarkdownArtifacts(accumulated));
      }
      return stripMarkdownArtifacts(accumulated);
    });
  } catch (error) {
    console.error('[AI Service Error]:', error);
    const fallback = error.message?.includes('429')
      ? "El asistente está muy solicitado en este momento. Por favor, espera unos segundos y vuelve a intentarlo."
      : "Lo siento, tengo problemas para conectarme ahora mismo. ¿Podemos intentarlo en un momento?";
    onChunk?.(fallback);
    return fallback;
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
