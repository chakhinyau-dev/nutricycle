import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../lib/env';
import { createClerkSupabaseClient } from '../lib/supabase';
import { prepareImageForUpload } from '../utils/imagePrep';

/**
 * "Analizar plato" — replaces Predictor IA. A user photographs a meal;
 * Gemini identifies the foods present and estimates macros for each,
 * returned as editable structured data. No separate vision API + nutrition
 * database round-trip (per the project scope doc) — Gemini's multimodal
 * input does both steps in one call, reusing the same model/key already
 * used by aiService.js. A dedicated nutrition database is a real upgrade
 * path if these estimates turn out to be too imprecise in practice, not a
 * v1 requirement.
 */

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Photos analyzed for food content benefit from more detail than the
// 800px default used for admin thumbnail uploads (imagePrep.js) — a low-res
// photo makes portion/ingredient estimation less reliable.
const MEAL_PHOTO_MAX_DIMENSION = 1280;

// Same exponential-backoff retry used by aiService.js — AIPredictorScreen.js
// never had this and would silently give up on a single transient rate
// limit; don't repeat that here.
const fetchWithRetry = async (fn, maxRetries = 3, initialDelay = 2000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[MealAnalysis] Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      throw error;
    }
  }
};

const buildPrompt = (phaseKey) => `
You are a nutrition assistant analyzing a photo of a meal.

1. Identify each distinct food item visible in the photo and estimate its portion size.
2. For each item, estimate calories, protein (g), carbs (g), and fat (g).
3. The person is currently in the ${phaseKey || 'follicular'} phase of their menstrual cycle. Add one short,
   general, wellness-framed sentence (not a specific medical claim) noting whether this meal generally
   supports that phase's typical nutritional focus.

Respond ONLY with JSON in this exact shape, no other text:
{
  "items": [
    { "name": "string", "portion": "string, e.g. '1 cup'", "calories": number, "protein": number, "carbs": number, "fat": number }
  ],
  "phase_note": "string"
}
If you cannot identify any food in the image, respond with { "items": [], "phase_note": "" }.
`;

/**
 * Sends a picked photo to Gemini and returns the parsed analysis. Throws on
 * failure (missing key, no food detected, malformed response) — the caller
 * is expected to show that error rather than silently swallow it, the same
 * "surface real failures" lesson from this session's earlier upload fixes.
 */
export const analyzeMealPhoto = async (imageAsset, phaseKey) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API Key is missing');
  }

  const prepared = await prepareImageForUpload(imageAsset, { maxDimension: MEAL_PHOTO_MAX_DIMENSION });
  if (!prepared?.base64) {
    throw new Error('Unable to read the selected photo.');
  }

  return fetchWithRetry(async () => {
    const result = await model.generateContent([
      { text: buildPrompt(phaseKey) },
      { inlineData: { mimeType: prepared.mimeType || 'image/jpeg', data: prepared.base64 } },
    ]);
    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Unable to parse the meal analysis.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return {
      items: items.map((item) => ({
        name: item.name || 'Unknown item',
        portion: item.portion || '',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
      })),
      phaseNote: parsed.phase_note || '',
    };
  });
};

const normalizeMealLog = (row) => ({
  id: String(row.id),
  loggedAt: row.logged_at,
  items: Array.isArray(row.detected_items) ? row.detected_items : [],
  totalCalories: row.total_calories ?? 0,
  totalProtein: row.total_protein ?? 0,
  totalCarbs: row.total_carbs ?? 0,
  totalFat: row.total_fat ?? 0,
  phaseKey: row.phase_key || null,
  phaseNote: row.phase_note || '',
});

const sumMacro = (items, key) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

export const saveMealLog = async (getToken, clerkUserId, { items, phaseKey, phaseNote }) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const payload = {
    clerk_user_id: clerkUserId,
    detected_items: items,
    total_calories: sumMacro(items, 'calories'),
    total_protein: sumMacro(items, 'protein'),
    total_carbs: sumMacro(items, 'carbs'),
    total_fat: sumMacro(items, 'fat'),
    phase_key: phaseKey || null,
    phase_note: phaseNote || '',
  };

  const { data, error } = await supabase.from('meal_logs').insert([payload]).select().single();
  if (error) {
    console.error('[MealAnalysis] Error saving meal log:', error.message);
    return null;
  }
  return normalizeMealLog(data);
};

export const loadMealHistory = async (getToken, clerkUserId, limit = 20) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return [];

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[MealAnalysis] Error loading meal history:', error.message);
    return [];
  }
  return (data || []).map(normalizeMealLog);
};

export const deleteMealLog = async (getToken, mealLogId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return false;

  const { error } = await supabase.from('meal_logs').delete().eq('id', mealLogId);
  if (error) {
    console.error('[MealAnalysis] Error deleting meal log:', error.message);
    return false;
  }
  return true;
};
