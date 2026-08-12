import { createClerkSupabaseClient } from '../lib/supabase';

/**
 * Shopping List sync layer — Supabase-backed, with AsyncStorage remaining the
 * fast local cache in ShoppingListScreen.js (same dual-write pattern
 * dailyLogService.js already uses: local writes happen immediately for a
 * responsive UI, remote writes are best-effort and never block/revert it).
 *
 * checked_items covers BOTH phase-food items and custom items (keyed
 * `custom_${id}`, matching ShoppingListScreen's existing local convention) —
 * shopping_list_custom_items.is_checked exists in the schema but is left
 * unused for now rather than splitting checked-state across two places.
 */

export const loadShoppingListState = async (getToken, clerkUserId, phaseKey) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('shopping_list_state')
    .select('checked_items')
    .eq('clerk_user_id', clerkUserId)
    .eq('phase_key', phaseKey)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error loading shopping list state:', error.message);
    return null;
  }

  return data?.checked_items || null;
};

export const saveShoppingListState = async (getToken, clerkUserId, phaseKey, checkedItems) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return false;

  const payload = {
    clerk_user_id: clerkUserId,
    phase_key: phaseKey,
    checked_items: checkedItems,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('shopping_list_state')
    .upsert(payload, { onConflict: 'clerk_user_id,phase_key' });

  if (error) {
    console.error('[Supabase] Error saving shopping list state:', error.message);
    return false;
  }

  return true;
};

const normalizeCustomItem = (row) => ({ id: row.id, name: row.name, isChecked: row.is_checked });

export const loadCustomItems = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('shopping_list_custom_items')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] Error loading custom items:', error.message);
    return null;
  }

  return data.map(normalizeCustomItem);
};

export const addCustomItem = async (getToken, clerkUserId, name) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('shopping_list_custom_items')
    .insert({ clerk_user_id: clerkUserId, name })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error adding custom item:', error.message);
    return null;
  }

  return normalizeCustomItem(data);
};

export const removeCustomItemRemote = async (getToken, clerkUserId, itemId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return false;

  const { error } = await supabase
    .from('shopping_list_custom_items')
    .delete()
    .eq('id', itemId)
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    console.error('[Supabase] Error removing custom item:', error.message);
    return false;
  }

  return true;
};

export const clearShoppingListRemote = async (getToken, clerkUserId, phaseKey) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return false;

  const [stateResult, customResult] = await Promise.all([
    supabase.from('shopping_list_state').delete().eq('clerk_user_id', clerkUserId).eq('phase_key', phaseKey),
    supabase.from('shopping_list_custom_items').delete().eq('clerk_user_id', clerkUserId),
  ]);

  if (stateResult.error) console.error('[Supabase] Error clearing shopping list state:', stateResult.error.message);
  if (customResult.error) console.error('[Supabase] Error clearing custom items:', customResult.error.message);

  return !stateResult.error && !customResult.error;
};
