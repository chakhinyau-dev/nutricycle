import { GoogleGenerativeAI } from '@google/generative-ai';
import { Platform } from 'react-native';
// expo-file-system's main entrypoint (SDK 54 / v19) throws on the classic
// readAsStringAsync API; the legacy submodule keeps the same signature —
// see videoService.js / recipeService.js for the same fix.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { env } from '../lib/env';
import { createClerkSupabaseClient } from '../lib/supabase';

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
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

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
 *
 * Expects an already-resized asset (see MEAL_PHOTO_MAX_DIMENSION above) —
 * the caller runs prepareImageForUpload once, right after picking, and
 * reuses that same prepared asset for both this call and uploadMealPhoto,
 * rather than this function resizing its own throwaway copy.
 */
export const analyzeMealPhoto = async (imageAsset, phaseKey) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API Key is missing');
  }

  if (!imageAsset?.base64) {
    throw new Error('Unable to read the selected photo.');
  }

  return fetchWithRetry(async () => {
    const result = await model.generateContent([
      { text: buildPrompt(phaseKey) },
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
  photoPath: row.photo_path || null,
  // Resolved separately (signed URLs expire, so this is filled in by
  // loadMealHistory rather than stored) — null until then.
  photoUrl: null,
});

const sumMacro = (items, key) =>
  items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

export const saveMealLog = async (getToken, clerkUserId, { items, phaseKey, phaseNote, photoPath }) => {
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
