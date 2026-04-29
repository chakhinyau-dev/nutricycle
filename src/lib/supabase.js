import { createClient } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from './env';

export const createClerkSupabaseClient = (getToken) => {
  if (!isSupabaseConfigured || typeof getToken !== 'function') {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    accessToken: async () => {
      try {
        const template = env.supabaseJwtTemplate || 'supabase';
        const token = await getToken({
          template: template,
        });
        if (!token) {
          console.error('[Supabase] CRITICAL: No JWT token returned from Clerk. Is the template named "' + template + '" created in Clerk dashboard?');
        }
        return token;
      } catch (error) {
        console.error('[Supabase] Error getting Clerk token:', error.message || error);
        return null;
      }
    },
  });
};
