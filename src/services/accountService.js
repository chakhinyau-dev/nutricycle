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

  const tables = [
    'daily_logs',
    'saved_recipes',
    'hydration_logs',
    'shopping_list_state',
    'shopping_list_custom_items',
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
