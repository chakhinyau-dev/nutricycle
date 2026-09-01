import { createClerkSupabaseClient } from '../lib/supabase';

// How many past messages to pull back when a chat screen opens — enough to
// resume a real conversation, not the full 30-day retention window (that
// would make every prompt to Gemini balloon in size and cost as history
// grows). Rows older than 30 days are deleted entirely by a pg_cron job
// (see the ai_chat_messages migration), not just excluded here.
const DEFAULT_HISTORY_LIMIT = 20;

export const saveChatMessage = async (getToken, clerkUserId, role, content) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert([{ clerk_user_id: clerkUserId, role, content }])
    .select()
    .single();

  if (error) {
    console.error('[chatHistoryService] Error saving message:', error.message);
    return null;
  }
  return data;
};

export const loadRecentChatHistory = async (getToken, clerkUserId, limit = DEFAULT_HISTORY_LIMIT) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[chatHistoryService] Error loading history:', error.message);
    return [];
  }

  // Returned newest-first for the query's own efficiency; callers rendering
  // a conversation want oldest-first.
  return (data || []).reverse().map((row) => ({
    id: row.id,
    role: row.role,
    text: row.content,
    createdAt: row.created_at,
  }));
};
