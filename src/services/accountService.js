import { createClerkSupabaseClient } from '../lib/supabase';

/**
 * Deletes every row owned by this user across the app's Supabase tables.
 * Must be called BEFORE the Clerk account itself is deleted — it needs a
 * live, authenticated session to satisfy the tables' RLS policies.
 *
 * Requires the "Users can delete own subscription" policy from
 * supabase/migrations/20260811120000_add_subscriptions_delete_policy.sql.
 */
export const deleteUserAccountData = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) {
    return { success: false };
  }

  // Deleting the meal_logs row below only clears its photo_path reference —
  // same distinction documented in cleanup-meal-photos/index.ts: a Storage
  // object has to be removed through the Storage API itself, raw table
  // deletes don't touch it. Without this, a deleted user's meal photos
  // would sit in the private meal-photos bucket forever. Uses the user's
  // own session (same RLS the rest of this function relies on) since the
  // storage.objects policies already scope by (storage.foldername(name))[1].
  try {
    const { data: files, error: listError } = await supabase.storage.from('meal-photos').list(clerkUserId);
    if (listError) {
      console.error('[Account Deletion] Failed to list meal photos:', listError.message);
    } else if (files?.length) {
      const paths = files.map((f) => `${clerkUserId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from('meal-photos').remove(paths);
      if (removeError) {
        console.error('[Account Deletion] Failed to remove meal photos:', removeError.message);
      }
    }
  } catch (e) {
    console.error('[Account Deletion] Meal photo cleanup threw:', e);
  }

  const tables = [
    'daily_logs',
    'saved_recipes',
    'hydration_logs',
    'shopping_list_state',
    'shopping_list_custom_items',
    'meal_logs',
    'meal_analysis_usage',
    'ai_chat_messages',
    'subscriptions',
    'profiles',
  ];

  const results = await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase.from(table).delete().eq('clerk_user_id', clerkUserId);
      if (error) {
        console.error(`[Account Deletion] Failed to delete from ${table}:`, error.message || error);
      }
      return !error;
    })
  );

  return { success: results.every(Boolean) };
};
