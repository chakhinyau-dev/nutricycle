
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

const sampleVideos = [
  {
    title: 'Receta fase folicular (Youtube Short)',
    description: 'Una idea rápida para acompañar la etapa de energía ascendente.',
    youtube_url: 'https://youtube.com/shorts/GdTEDblpPxY?feature=share',
    phase_key: 'follicular',
    category: 'Nutricion',
    duration: '0:56',
    thumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
  },
  {
    title: 'Conectar fase y comidas (Youtube Short)',
    description: 'Por qué las recomendaciones cambian según tu ciclo.',
    youtube_url: 'https://youtube.com/shorts/Shg1SZKzZzw?feature=share',
    phase_key: 'luteal',
    category: 'Ciclo',
    duration: '1:12',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'
  }
];

async function seedVideos() {
  console.log('Seeding sample videos into Supabase (Insert only)...');
  
  const { data, error } = await supabase
    .from('videos')
    .insert(sampleVideos)
    .select();

  if (error) {
    console.error('Error seeding videos:', error.message);
  } else {
    console.log('Successfully seeded videos:', data.length);
  }
  
  console.log('Seeding complete.');
}

seedVideos();
