import { createClerkSupabaseClient } from '../lib/supabase';
import { ARTICLE_LIBRARY } from '../utils/articleData';

const normalizeArticle = (article) => ({
  id: String(article.id),
  title: article.title,
  excerpt: article.excerpt || '',
  image: article.image_url || article.image || '',
  time: article.time || article.read_time || '',
  tag: article.tag || article.category || '',
});

export const loadArticles = async (getToken) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('articles').select('*').order('id', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching articles:', error.message);
    return [];
  }

  return (data || []).map(normalizeArticle);
};
