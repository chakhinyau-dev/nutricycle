
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('recipes').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error connecting to Supabase:', error.message);
    if (error.message.includes('relation "recipes" does not exist')) {
        console.log('TIP: It seems the "recipes" table is missing in your Supabase project.');
    }
  } else {
    console.log('Successfully connected to Supabase!');
    console.log('Recipes count:', data);
  }

  const { data: videoData, error: videoError } = await supabase.from('videos').select('count', { count: 'exact', head: true });
  if (videoError) {
      console.error('Error connecting to videos table:', videoError.message);
  } else {
      console.log('Videos table exists! Count:', videoData);
  }
}

testConnection();
