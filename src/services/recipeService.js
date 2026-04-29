import { createClerkSupabaseClient } from '../lib/supabase';

const FALLBACK_RECIPE_IMAGE =
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800';

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
  ingredients: toArray(recipe.ingredients),
  instructions: toArray(recipe.instructions),
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
        return null;
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
        return null;
      }
      return normalizeRecipe(data);
    }
  } catch (err) {
    console.error('[saveRecipe Catch]:', err);
    return null;
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
    const base64 = typeof fileInput === 'object' ? fileInput?.base64 : null;
    const mimeType = typeof fileInput === 'object' ? fileInput?.mimeType || 'image/jpeg' : 'image/jpeg';

    let blob = null;
    let lastError = null;

    if (fileUri) {
      try {
        const response = await fetch(fileUri);
        blob = await response.blob();
      } catch (error) {
        lastError = error;
      }
    }

    if (!blob && base64) {
      const dataUrl = base64.startsWith('data:')
        ? base64
        : `data:${mimeType};base64,${base64}`;
      const response = await fetch(dataUrl);
      blob = await response.blob();
    }

    if (!blob) {
      throw lastError || new Error('Unable to read the selected image.');
    }

    const fileExt = fileName.split('.').pop();
    const path = `recipes/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage.from('recipe-images').upload(path, blob);
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
