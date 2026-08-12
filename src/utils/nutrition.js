/**
 * Single source of truth for a recipe's macro breakdown (protein/carbs/fat/fiber).
 *
 * Recipes don't always have real stored macro values — when they don't, this
 * is the ONE place that guesses them from calories. Previously NutritionScreen.js
 * and RecipeDetailScreen.js each had their own separate, disagreeing estimate
 * formula, so the same recipe could show different macro numbers depending on
 * which screen you viewed it from. Both now call this instead.
 */

// Standard-ish macro split (24% protein / 46% carbs / 30% fat by calories,
// plus the common "~14g fiber per 1000 kcal" guideline) — only used as a
// fallback when a recipe has no real protein/carbs/fat/fiber of its own.
export const estimateMacros = (calories) => {
  const cal = Number(calories) || 0;
  return {
    protein: Math.max(0, Math.round((cal * 0.24) / 4)),
    carbs: Math.max(0, Math.round((cal * 0.46) / 4)),
    fat: Math.max(0, Math.round((cal * 0.30) / 9)),
    fiber: Math.max(0, Math.round(cal * 0.014)),
  };
};

/**
 * Returns a recipe's real macro values when present (protein/carbs/fat/fiber
 * columns), falling back to the shared estimate per field so partially-filled
 * recipes (e.g. protein known, fiber not) still show consistent numbers.
 */
export const getRecipeMacros = (recipe) => {
  const estimated = estimateMacros(recipe?.calories);
  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    protein: toNumber(recipe?.protein) ?? estimated.protein,
    carbs: toNumber(recipe?.carbs) ?? estimated.carbs,
    fat: toNumber(recipe?.fat) ?? estimated.fat,
    fiber: toNumber(recipe?.fiber) ?? estimated.fiber,
  };
};
