import { createClerkSupabaseClient } from '../lib/supabase';

const normalizeId = (value) => String(value);

export const loadSavedRecipeIds = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_recipes')
    .select('recipe_id')
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    console.error('[Supabase] Error loading saved recipes:', error.message, error.details, error.hint);
    return [];
  }

  return (data || []).map((item) => normalizeId(item.recipe_id));
};

export const saveRecipeForUser = async (getToken, clerkUserId, recipeId) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId || recipeId == null) {
    return false;
  }

  const { error } = await supabase.from('saved_recipes').upsert(
    {
      clerk_user_id: clerkUserId,
      recipe_id: Number(recipeId),
    },
    { onConflict: 'clerk_user_id,recipe_id' }
  );

  if (error) {
    console.error('[Supabase Save Error]', error.message, error.details, error.hint);
    return false;
  }

  return true;
};

export const removeSavedRecipeForUser = async (getToken, clerkUserId, recipeId) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId || recipeId == null) {
    return false;
  }

  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('clerk_user_id', clerkUserId)
    .eq('recipe_id', Number(recipeId));

  if (error) {
    console.error('[Supabase Remove Error]', error.message, error.details, error.hint);
    return false;
  }

  return true;
};

export const toggleSavedRecipeForUser = async (getToken, clerkUserId, recipeId, isSaved) => {
  if (isSaved) {
    return removeSavedRecipeForUser(getToken, clerkUserId, recipeId);
  }

  return saveRecipeForUser(getToken, clerkUserId, recipeId);
};
