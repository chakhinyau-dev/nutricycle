import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Platform } from 'react-native';
// expo-file-system's main entrypoint (SDK 54 / v19) throws on the classic
// readAsStringAsync API; the legacy submodule keeps the same signature —
// see videoService.js / recipeService.js for the same fix.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { env } from '../lib/env';
import { createClerkSupabaseClient } from '../lib/supabase';
import { SYSTEM_PROMPT, buildContextBlock, stripMarkdownArtifacts } from './aiService';

// Cost-protection cap: each analysis is a real Gemini API call regardless of
// whether the result ever gets saved, so this is tracked separately from
// saved meal_logs rows (a user could analyze 50 photos and save none).
const DAILY_ANALYSIS_CAP = 15;
const MEAL_PHOTO_SIGNED_URL_TTL = 60 * 60; // 1 hour — regenerated each time history loads

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
// gemini-2.0-flash was retired by Google (calls started failing with a 404
// telling callers to move to gemini-3.6-flash) — same fix as aiService.js,
// confirmed via a real end-to-end test call against the live API.
//
// responseMimeType/responseSchema below: found via live testing that asking
// nicely in the prompt for valid JSON isn't reliable once the response
// includes a long free-form prose field (the "evaluation" text) — Gemini
// occasionally emits an unescaped quote or similar inside that prose and
// breaks the surrounding JSON, which then fails to parse. Structured output
// mode constrains generation at the API level to guarantee syntactically
// valid JSON matching this exact shape, eliminating that failure mode
// entirely instead of just asking for it in words.
const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              portion: { type: SchemaType.STRING },
              calories: { type: SchemaType.NUMBER },
              protein: { type: SchemaType.NUMBER },
              carbs: { type: SchemaType.NUMBER },
              fat: { type: SchemaType.NUMBER },
            },
            required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
        phase_note: { type: SchemaType.STRING },
        evaluation: { type: SchemaType.STRING },
      },
      required: ['items', 'phase_note', 'evaluation'],
    },
  },
}, {
  // Same reasoning as aiService.js's chat model — bounds a stalled request
  // to a predictable worst case instead of hanging indefinitely. Slightly
  // longer than chat's 20s since this call is multimodal (image + a longer
  // JSON response) and genuinely takes a bit more processing time.
  timeout: 25000,
});

// Per client request: when Gemini misidentifies a food in the photo (e.g.
// calls a pear an apple), the user needs a real way to correct it — not just
// rename the label while stale macros from the wrong food stay attached.
// This is a much smaller, text-only call (just the corrected name/portion,
// no image), so it gets its own lightweight schema/model instead of reusing
// the full analyzeMealPhoto one.
const itemCorrectionModel = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        calories: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.NUMBER },
        carbs: { type: SchemaType.NUMBER },
        fat: { type: SchemaType.NUMBER },
      },
      required: ['calories', 'protein', 'carbs', 'fat'],
    },
  },
}, { timeout: 15000 });

// Re-runs the phase_note/evaluation fields after an item correction — the
// client's requirement was explicit that "the Content must also change in
// accordance with this change", so a corrected item can't just sit there
// with an evaluation that was written about the AI's original, wrong read
// of the photo. Same voice/schema shape as analyzeMealPhoto's evaluation,
// just grounded in the (already corrected) items list instead of an image.
const reevaluationModel = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        phase_note: { type: SchemaType.STRING },
        evaluation: { type: SchemaType.STRING },
      },
      required: ['phase_note', 'evaluation'],
    },
  },
}, { timeout: 20000 });

// Photos analyzed for food content benefit from more detail than the
// 800px default used for admin thumbnail uploads (imagePrep.js) — a low-res
// photo makes portion/ingredient estimation less reliable. Exported so the
// screen can run the SAME resize once, right after picking — matching
// AdminScreen.js's pattern (prepareImageForUpload immediately on pick,
// before the asset ever lands in state or gets uploaded) — instead of
// storing the raw, multi-MB original and resizing a throwaway copy only
// for the Gemini call, which is what left the full-size original to be
// uploaded to Storage untouched.
export const MEAL_PHOTO_MAX_DIMENSION = 1280;

// Same exponential-backoff retry used by aiService.js — AIPredictorScreen.js
// never had this and would silently give up on a single transient rate
// limit; don't repeat that here. Also retries 503 (model overloaded) —
// confirmed via a real live call that Gemini's own "high demand, usually
// temporary" 503s were previously not retried at all, same gap as
// aiService.js.
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
        console.warn(`[MealAnalysis] Retryable error (429/503). Retrying in ${delay}ms... (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      throw error;
    }
  }
};

/**
 * Folds in the exact same voice + profile/logs context aiService.js uses for
 * AI Chat — per client request, the "is this good or bad for me right now"
 * evaluation should read identically to what the user would get pasting the
 * same situation into a chat message, not a separately-tuned tone. Reusing
 * SYSTEM_PROMPT and buildContextBlock directly (rather than re-describing
 * the voice here) is what guarantees that, and keeps this to ONE Gemini
 * call per photo instead of a second chat round-trip after the fact —
 * relevant given the daily quota/billing conversation already in progress.
 */
const buildPrompt = (context = {}) => {
  const phaseKey = context.currentPhase || context.phaseKey;
  const contextBlock = buildContextBlock(context);

  return `
${SYSTEM_PROMPT}

${contextBlock}

You're looking at a photo of a meal the user just photographed.

1. Identify each distinct food item visible in the photo and estimate its portion size.
2. For each item, estimate calories, protein (g), carbs (g), and fat (g).
3. "phase_note": one short, general, wellness-framed sentence (not a specific medical claim) noting
   whether this meal generally supports the ${phaseKey || 'follicular'} phase's typical nutritional focus.
4. "evaluation": in your own voice exactly as described above — casual, warm, like you're texting a
   friend, no asterisks, no markdown — 3 to 5 sentences telling her whether this specific meal is a
   good or a bad choice for her RIGHT NOW, using everything in the profile above. Be honest about any
   pros or cons for today specifically given her current phase and logs, and mention if there's a
   longer-term angle worth knowing (something great long-term but not ideal in this exact moment, or
   vice versa). End this field with the same short "Sources:"/"Fuentes:" line your voice rules describe.

The response format itself is enforced separately — just focus on getting the content of each field
right. If you cannot identify any food in the image, return an empty items array and empty strings
for phase_note and evaluation.
`;
};

/**
 * Sends a picked photo to Gemini and returns the parsed analysis. Throws on
 * failure (missing key, no food detected, malformed response) — the caller
 * is expected to show that error rather than silently swallow it, the same
 * "surface real failures" lesson from this session's earlier upload fixes.
 *
 * Expects an already-resized asset (see MEAL_PHOTO_MAX_DIMENSION above) —
 * the caller runs prepareImageForUpload once, right after picking, and
 * reuses that same prepared asset for both this call and uploadMealPhoto,
 * rather than this function resizing its own throwaway copy.
 *
 * `context` mirrors what AIChatScreen.js builds for getGeminiChatResponse —
 * currentPhase/phaseKey, day, userName, cycleLength, periodLength,
 * recentLogs, recentMeals — so the evaluation field above has the same
 * grounding a real chat message would.
 */
export const analyzeMealPhoto = async (imageAsset, context = {}) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API Key is missing');
  }

  if (!imageAsset?.base64) {
    throw new Error('Unable to read the selected photo.');
  }

  return fetchWithRetry(async () => {
    const result = await model.generateContent([
      { text: buildPrompt(context) },
      { inlineData: { mimeType: imageAsset.mimeType || 'image/jpeg', data: imageAsset.base64 } },
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
      items: items.map((item) => {
        // unitX values are the immutable per-item baseline Gemini estimated
        // (i.e. macros for quantity=1, as photographed) — kept alongside the
        // editable calories/protein/carbs/fat so the quantity stepper in
        // MealAnalyzerScreen.js can always scale from a stable reference
        // point, no matter how many times quantity is adjusted up or down.
        // Per client feedback: editing the free-text "portion" (e.g. "1
        // potato" -> "2 potatoes") never updated the macros, since there's
        // no reliable way to parse an arbitrary text edit into a scale
        // factor — a real quantity control replaces that guesswork.
        const unitCalories = Number(item.calories) || 0;
        const unitProtein = Number(item.protein) || 0;
        const unitCarbs = Number(item.carbs) || 0;
        const unitFat = Number(item.fat) || 0;
        return {
          name: item.name || 'Unknown item',
          portion: item.portion || '',
          quantity: 1,
          calories: unitCalories,
          protein: unitProtein,
          carbs: unitCarbs,
          fat: unitFat,
          unitCalories,
          unitProtein,
          unitCarbs,
          unitFat,
        };
      }),
      phaseNote: parsed.phase_note || '',
      evaluation: stripMarkdownArtifacts(parsed.evaluation || ''),
    };
  });
};

const buildCorrectionPrompt = (correctedName, portion) => `
You are a nutrition estimation assistant. A user is correcting a food item that a photo-analysis AI
misidentified — you are not analyzing an image, just estimating macros for the food she tells you it
actually is.

Corrected food: "${correctedName}"
Portion/quantity as described by the user: "${portion || '1 serving'}"

Estimate realistic calories, protein (g), carbs (g), and fat (g) for exactly this food and portion.
Respond with only the numeric estimates.
`;

/**
 * Re-estimates macros for a single food item the user has told us was
 * misidentified — a text-only call (no image), used when the user edits an
 * item's name in MealAnalyzerScreen.js and asks to recalculate. Returns a
 * fresh per-serving baseline (quantity=1), the same shape as an item's
 * unitX fields from analyzeMealPhoto.
 */
export const correctMealItem = async (correctedName, portion) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API Key is missing');
  }
  if (!correctedName?.trim()) {
    throw new Error('Enter the correct food name.');
  }

  return fetchWithRetry(async () => {
    const result = await itemCorrectionModel.generateContent(buildCorrectionPrompt(correctedName, portion));
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Unable to parse the corrected item.');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
    };
  });
};

const buildReevaluationPrompt = (items, context = {}) => {
  const phaseKey = context.currentPhase || context.phaseKey;
  const contextBlock = buildContextBlock(context);
  const itemsText = items
    .map((item) => {
      const qty = item.quantity || 1;
      return `- ${item.name} (${item.portion || 'porción'}, x${qty}): ${Math.round(item.calories)} kcal, ${Math.round(item.protein)}g protein, ${Math.round(item.carbs)}g carbs, ${Math.round(item.fat)}g fat`;
    })
    .join('\n');

  return `
${SYSTEM_PROMPT}

${contextBlock}

The user already analyzed a meal photo and just corrected how one or more foods in it were identified.
Here is the final, corrected list of items in this meal:
${itemsText}

1. "phase_note": one short, general, wellness-framed sentence noting whether this meal generally
   supports the ${phaseKey || 'follicular'} phase's typical nutritional focus.
2. "evaluation": in your own voice exactly as described above — casual, warm, like you're texting a
   friend, no asterisks, no markdown — 3 to 5 sentences telling her whether this specific (corrected)
   meal is a good or a bad choice for her RIGHT NOW, using everything in the profile above. End this
   field with the same short "Sources:"/"Fuentes:" line your voice rules describe.

Respond with only phase_note and evaluation, reflecting this corrected item list — not whatever the
foods were originally misidentified as.
`;
};

/**
 * Regenerates phase_note/evaluation after one or more items were corrected —
 * per client request, "the Content must also change in accordance with this
 * change", not just the macros. Text-only (no image), same SYSTEM_PROMPT
 * voice as analyzeMealPhoto/AI Chat.
 */
export const reevaluateMeal = async (items, context = {}) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API Key is missing');
  }
  if (!items?.length) {
    return { phaseNote: '', evaluation: '' };
  }

  return fetchWithRetry(async () => {
    const result = await reevaluationModel.generateContent(buildReevaluationPrompt(items, context));
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Unable to parse the updated evaluation.');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      phaseNote: parsed.phase_note || '',
      evaluation: stripMarkdownArtifacts(parsed.evaluation || ''),
    };
  });
};

/**
 * Atomically increments today's analysis count for this user and reports
 * whether they're still under the daily cap. Checked (and incremented)
 * BEFORE calling Gemini, since the cost is incurred at analysis time, not
 * at save time. The upsert with `count = count + 1` is atomic in Postgres,
 * so two near-simultaneous requests can't both slip through under the cap.
 */
export const checkAndIncrementUsage = async (getToken, clerkUserId, dailyCap = DAILY_ANALYSIS_CAP) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return { allowed: true, count: 0, cap: dailyCap };

  const today = new Date().toISOString().split('T')[0];

  const { data: existing, error: lookupError } = await supabase
    .from('meal_analysis_usage')
    .select('count')
    .eq('clerk_user_id', clerkUserId)
    .eq('usage_date', today)
    .maybeSingle();

  if (lookupError) {
    // Doesn't block the analysis (fail open, same as the upsert error below)
    // but this was previously swallowed with no trace at all — e.g. the
    // migration not having been run yet would silently look identical to
    // "no usage today" instead of surfacing anywhere.
    console.error('[MealAnalysis] Error checking usage:', lookupError.message);
  }

  const currentCount = existing?.count || 0;
  if (currentCount >= dailyCap) {
    return { allowed: false, count: currentCount, cap: dailyCap };
  }

  const { data, error } = await supabase
    .from('meal_analysis_usage')
    .upsert(
      { clerk_user_id: clerkUserId, usage_date: today, count: currentCount + 1 },
      { onConflict: 'clerk_user_id,usage_date' }
    )
    .select('count')
    .single();

  if (error) {
    console.error('[MealAnalysis] Error tracking usage:', error.message);
    // Fail open — a tracking hiccup shouldn't block a real analysis.
    return { allowed: true, count: currentCount + 1, cap: dailyCap };
  }

  return { allowed: true, count: data.count, cap: dailyCap };
};

/**
 * Uploads a meal photo to the private meal-photos bucket, scoped under the
 * user's own clerk_user_id (the RLS policies check that path segment).
 * Returns the storage path — not a public URL, since the bucket is private
 * and needs a signed URL for display (see getMealPhotoSignedUrl).
 * Same proven multi-fallback read pattern as recipeService.js's
 * uploadRecipeImage, since fetch(file://…) is unreliable on native.
 */
export const uploadMealPhoto = async (getToken, clerkUserId, imageAsset) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  try {
    const fileUri = typeof imageAsset === 'string' ? imageAsset : imageAsset?.uri;
    const pickerBase64 = typeof imageAsset === 'object' ? imageAsset?.base64 : null;
    const mimeType = (typeof imageAsset === 'object' && imageAsset?.mimeType) || 'image/jpeg';

    const base64ToArrayBuffer = (raw) => {
      const trimmed = String(raw || '').trim();
      if (!trimmed) return null;
      const dataPart = trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
      try {
        return decode(dataPart);
      } catch (e) {
        console.warn('[MealPhoto] base64 decode failed:', e?.message);
        return null;
      }
    };

    let uploadBody = pickerBase64 ? base64ToArrayBuffer(pickerBase64) : null;

    if (!uploadBody && fileUri && Platform.OS !== 'web') {
      try {
        const diskB64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
        uploadBody = base64ToArrayBuffer(diskB64);
      } catch (e) {
        console.warn('[MealPhoto] FileSystem.readAsStringAsync failed:', e?.message);
      }
    }

    if (!uploadBody && fileUri) {
      try {
        const response = await fetch(fileUri);
        uploadBody = await response.blob();
      } catch (e) {
        console.warn('[MealPhoto] fetch(uri) failed:', e?.message);
      }
    }

    if (!uploadBody && pickerBase64) {
      const dataUrl = pickerBase64.startsWith('data:')
        ? pickerBase64
        : `data:${mimeType};base64,${pickerBase64}`;
      try {
        const response = await fetch(dataUrl);
        uploadBody = await response.blob();
      } catch (e) {
        console.warn('[MealPhoto] fetch(dataUrl) failed:', e?.message);
      }
    }

    if (!uploadBody) {
      throw new Error('Unable to read the meal photo.');
    }

    const path = `${clerkUserId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('meal-photos').upload(path, uploadBody, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      console.error('[MealAnalysis] Error uploading meal photo:', error.message);
      return null;
    }
    return path;
  } catch (error) {
    console.error('[MealAnalysis] Meal photo upload failed:', error);
    return null;
  }
};

export const getMealPhotoSignedUrl = async (getToken, photoPath) => {
  if (!photoPath) return null;
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from('meal-photos')
    .createSignedUrl(photoPath, MEAL_PHOTO_SIGNED_URL_TTL);

  if (error) {
    console.error('[MealAnalysis] Error signing meal photo URL:', error.message);
    return null;
  }
  return data?.signedUrl || null;
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
  evaluation: row.ai_evaluation || '',
  photoPath: row.photo_path || null,
  // Resolved separately (signed URLs expire, so this is filled in by
  // loadMealHistory rather than stored) — null until then.
  photoUrl: null,
});

const sumMacro = (items, key) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

export const saveMealLog = async (getToken, clerkUserId, { items, phaseKey, phaseNote, evaluation, photoPath }) => {
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
    ai_evaluation: evaluation || '',
    photo_path: photoPath || null,
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

  const normalized = (data || []).map(normalizeMealLog);
  await Promise.all(
    normalized.map(async (meal) => {
      if (meal.photoPath) {
        meal.photoUrl = await getMealPhotoSignedUrl(getToken, meal.photoPath);
      }
    })
  );
  return normalized;
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
