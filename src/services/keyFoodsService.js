import { createClerkSupabaseClient } from '../lib/supabase';
import { FOODS_BY_PHASE } from '../utils/foodsData';

const normalizeFood = (row) => ({
  id: String(row.id),
  phaseKey:    row.phase_key,
  categoryKey: row.category_key,
  name:        row.name,
  hormoneTag:  row.hormone_tag || 'energy',
  mealType:    row.meal_type  || 'lunch',
  benefits:    row.benefits   || '',
  imageUrl:    row.image_url  || '',
});

export const loadKeyFoods = async (getToken) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return buildFallback();

  const { data, error } = await supabase
    .from('key_foods')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    console.warn('[keyFoodsService] fallback to static data', error?.message);
    return buildFallback();
  }

  return groupByPhase(data.map(normalizeFood));
};

export const saveKeyFood = async (getToken, food) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  const payload = {
    phase_key:    food.phaseKey,
    category_key: food.categoryKey,
    name:         food.name,
    hormone_tag:  food.hormoneTag,
    meal_type:    food.mealType,
    benefits:     food.benefits || '',
    image_url:    food.imageUrl || '',
    updated_at:   new Date().toISOString(),
  };

  if (food.id && !food.id.startsWith('temp_')) {
    const { data, error } = await supabase
      .from('key_foods')
      .update(payload)
      .eq('id', food.id)
      .select()
      .single();
    if (error) {
      console.error('[keyFoodsService] update error', error.message);
      // Previously swallowed and returned null, so every failure — RLS
      // rejection, a check-constraint violation (e.g. the category_key
      // constraint not matching the admin UI's actual category options),
      // anything — surfaced as the same generic "check your connection or
      // admin role" message with no way to tell what actually went wrong.
      throw new Error(error.message);
    }
    return normalizeFood(data);
  } else {
    const { data, error } = await supabase
      .from('key_foods')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('[keyFoodsService] insert error', error.message);
      throw new Error(error.message);
    }
    return normalizeFood(data);
  }
};

export const deleteKeyFood = async (getToken, foodId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return false;
  const { error } = await supabase.from('key_foods').delete().eq('id', foodId);
  if (error) { console.error('[keyFoodsService] delete error', error.message); return false; }
  return true;
};

// Convert flat list → { menstrual: [{categoryKey, items:[]}], ... }
const groupByPhase = (foods) => {
  const phases = ['menstrual', 'follicular', 'ovulation', 'luteal'];
  const categories = ['proteins', 'fats', 'carbs', 'veg_fruits'];
  const result = {};
  phases.forEach(phase => {
    result[phase] = categories.map(cat => ({
      categoryKey: cat,
      items: foods
        .filter(f => f.phaseKey === phase && f.categoryKey === cat)
        .map(f => ({
          key:        f.id,
          name:       f.name,
          mealType:   f.mealType,
          hormoneTag: f.hormoneTag,
          benefits:   f.benefits,
          image:      f.imageUrl,
        })),
    })).filter(cat => cat.items.length > 0);
  });
  return result;
};

// Convert static FOODS_BY_PHASE into the same shape
const buildFallback = () => {
  const result = {};
  Object.keys(FOODS_BY_PHASE).forEach(phase => {
    result[phase] = FOODS_BY_PHASE[phase].map(cat => ({
      categoryKey: cat.categoryKey,
      items: cat.items.map(item => ({
        key:        item.key,
        name:       item.key,
        mealType:   item.mealType,
        hormoneTag: item.hormoneTag,
        image:      item.image,
      })),
    }));
  });
  return result;
};
