import { Platform } from 'react-native';
// expo-file-system's main entrypoint (SDK 54 / v19) throws on the classic
// readAsStringAsync/getInfoAsync-style API now — it's been moved to a
// legacy submodule with the exact same signatures for anyone not yet
// migrated to the new File/Directory classes.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { createClerkSupabaseClient } from '../lib/supabase';

const FALLBACK_RECIPE_IMAGE =
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800';

const _extractYouTubeId = (url) => {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/)([^#&?]{11})/);
  return m ? m[1] : null;
};

export const getRecipeVideoThumbnail = (recipe) => {
  const url = recipe?.youtubeUrl || recipe?.videoUrl || recipe?.youtube_url || recipe?.video_url;
  const id = _extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const getRecipeImageUrl = (recipe) => {
  if (!recipe) {
    return FALLBACK_RECIPE_IMAGE;
  }

  if (typeof recipe === 'string') {
    return recipe || FALLBACK_RECIPE_IMAGE;
  }

  // Handle if the input is already a source object { uri: '...' }
  if (recipe.uri) {
    return recipe.uri;
  }

  return (
    recipe.image_url ||
    recipe.imageUrl ||
    recipe.image?.uri ||
    recipe.image?.url ||
    recipe.image ||
    FALLBACK_RECIPE_IMAGE
  );
};

export const getRecipeImageSource = (recipe) => {
  const imageUrl = getRecipeImageUrl(recipe);
  return { uri: imageUrl };
};

const normalizeRecipe = (recipe) => ({
  id: String(recipe.id),
  title: recipe.title,
  calories: recipe.calories ?? 0,
  time: recipe.time_minutes ?? recipe.time ?? 20,
  category: recipe.category || recipe.phase_label || 'NutriCycle',
  phaseKey: recipe.phase_key || recipe.phaseKey,
  mealType: recipe.meal_type || recipe.mealType || 'lunch',
  nutritionalInsight: recipe.nutritional_insight || recipe.nutritionalInsight || '',
  imageUrl: getRecipeImageUrl(recipe),
  image: getRecipeImageSource(recipe),
  youtubeUrl: recipe.youtube_url || recipe.youtubeUrl || '',
  videoUrl: recipe.video_url || recipe.videoUrl || '',
  ingredients: toArray(recipe.ingredients),
  instructions: toArray(recipe.instructions),
  coachingTips: recipe.coaching_tips || recipe.coachingTips || '',
  // Real macro values when the admin filled them in; null when not, so
  // getRecipeMacros() (src/utils/nutrition.js) knows to fall back to its
  // shared estimate instead of every screen guessing independently.
  protein: recipe.protein ?? null,
  carbs: recipe.carbs ?? null,
  fat: recipe.fat ?? null,
  fiber: recipe.fiber ?? null,
});

export const loadRecipes = async (getToken) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching recipes:', error.message);
    return [];
  }

  return (data || []).map(normalizeRecipe);
};

export const saveRecipe = async (getToken, recipe) => {
  try {
    const supabase = createClerkSupabaseClient(getToken);
    if (!supabase) return null;

    // Optional — left as null (not 0) when blank, so getRecipeMacros() falls
    // back to its estimate instead of treating an empty field as "zero grams".
    const parseOptionalNumber = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const payload = {
      title: recipe.title || 'Untitled',
      category: recipe.category || 'General',
      phase_key: recipe.phase_key || recipe.phaseKey || 'follicular',
      meal_type: recipe.meal_type || recipe.mealType || 'lunch',
      calories: parseInt(recipe.calories) || 0,
      time_minutes: parseInt(recipe.time) || parseInt(recipe.time_minutes) || 20,
      nutritional_insight: recipe.nutritional_insight || recipe.nutritionalInsight || '',
      image_url:
        recipe.image_url ||
        recipe.imageUrl ||
        recipe.image?.uri ||
        recipe.image?.url ||
        '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      coaching_tips: recipe.coaching_tips || recipe.coachingTips || '',
      protein: parseOptionalNumber(recipe.protein),
      carbs: parseOptionalNumber(recipe.carbs),
      fat: parseOptionalNumber(recipe.fat),
      fiber: parseOptionalNumber(recipe.fiber),
      updated_at: new Date().toISOString(),
    };

    console.log('[Supabase Recipe Save] Payload:', JSON.stringify(payload, null, 2));

    const isUpdating = recipe.id && !String(recipe.id).startsWith('temp_');

    if (isUpdating) {
      const { data, error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipe.id)
        .select()
        .single();

      if (error) {
        console.error('[Supabase Update Error]:', error.message, error.details, error.hint);
        // Previously swallowed and returned null, same gap as saveKeyFood
        // had — every failure (RLS rejection, a constraint violation,
        // anything) surfaced as the same generic "check your connection or
        // admin role" message with no way to diagnose it remotely. Now
        // throws the real error instead.
        throw new Error(error.message);
      }
      return normalizeRecipe(data);
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[Supabase Insert Error]:', error.message, error.details, error.hint);
        throw new Error(error.message);
      }
      return normalizeRecipe(data);
    }
  } catch (err) {
    console.error('[saveRecipe Catch]:', err);
    // Re-throw (rather than swallowing into a null return) so the admin
    // sees the actual error message instead of a generic one.
    throw err;
  }
};

export const deleteRecipe = async (getToken, recipeId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return false;

  const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
  if (error) {
    console.error('[Supabase] Error deleting recipe:', error);
    return false;
  }
  return true;
};

export const uploadRecipeImage = async (getToken, fileInput, fileName) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  try {
    const fileUri = typeof fileInput === 'string' ? fileInput : fileInput?.uri;
    const pickerBase64 = typeof fileInput === 'object' ? fileInput?.base64 : null;
    const mimeType =
      typeof fileInput === 'object' && fileInput?.mimeType
        ? fileInput.mimeType
        : 'image/jpeg';

    /**
     * React Native often cannot `fetch(file://…)` / `fetch(content://…)` for a Blob.
     * Prefer ImagePicker base64, then expo-file-system, then fetch (web / last resort).
     */
    let uploadBody = null;

    const base64ToArrayBuffer = (raw) => {
      const trimmed = String(raw || '').trim();
      if (!trimmed) return null;
      const dataPart = trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
      try {
        return decode(dataPart);
      } catch (e) {
        console.warn('[RecipeImage] base64 decode failed:', e?.message);
        return null;
      }
    };

    if (pickerBase64) {
      uploadBody = base64ToArrayBuffer(pickerBase64);
    }

    if (!uploadBody && fileUri && Platform.OS !== 'web') {
      try {
        const diskB64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });
        uploadBody = base64ToArrayBuffer(diskB64);
      } catch (e) {
        console.warn('[RecipeImage] FileSystem.readAsStringAsync failed:', e?.message);
      }
    }

    if (!uploadBody && fileUri) {
      try {
        const response = await fetch(fileUri);
        uploadBody = await response.blob();
      } catch (e) {
        console.warn('[RecipeImage] fetch(uri) failed:', e?.message);
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
        console.warn('[RecipeImage] fetch(dataUrl) failed:', e?.message);
      }
    }

    if (!uploadBody) {
      throw new Error('Unable to read the selected image.');
    }

    const fileExt = (fileName && fileName.includes('.') && fileName.split('.').pop()) || 'jpg';
    const path = `recipes/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage.from('recipe-images').upload(path, uploadBody, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      console.error('[Supabase] Recipe Image Upload Error:', error.message);
      throw error;
    }

    const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(data?.path || path);
    console.log('[Supabase] Recipe image uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[Supabase] Error uploading recipe image:', error);
    return null;
  }
};
