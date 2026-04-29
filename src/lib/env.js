export const env = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseJwtTemplate: process.env.EXPO_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE || 'supabase',
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'nutricycle',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  stripeMonthlyPriceLookupKey: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_LOOKUP_KEY || 'balance_monthly',
  stripeAnnualPriceLookupKey: process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_LOOKUP_KEY || 'balance_annual',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
};

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

export const getMissingRequiredEnv = () => {
  const missing = [];

  if (!env.clerkPublishableKey) {
    missing.push('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }

  return missing;
};

export const getMissingRecommendedEnv = () => {
  const missing = [];

  if (!env.supabaseUrl) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!env.supabaseAnonKey) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!env.stripePublishableKey) {
    missing.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }

  return missing;
};
