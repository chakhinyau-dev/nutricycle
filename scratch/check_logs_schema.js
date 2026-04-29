
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Checking daily_logs schema...');
  
  // Try to insert a dummy row with all fields to see which ones fail
  const { error } = await supabase
    .from('daily_logs')
    .insert({
      clerk_user_id: 'test_user',
      mood: 'test',
      symptoms: [],
      notes: 'test',
      cycle_day: 1,
      phase_key: 'follicular',
      logged_at: new Date().toISOString()
    });

  if (error) {
    console.log('Error details:', error.message);
    if (error.message.includes('column') && error.message.includes('not exist')) {
        console.log('Detected missing columns based on error.');
    }
  } else {
    console.log('Insert successful! Columns likely exist.');
  }
}

checkSchema();
