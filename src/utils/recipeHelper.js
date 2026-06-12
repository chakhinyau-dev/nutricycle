export const getRecipesForDayAndPhase = (recipes, phaseKey, dayIndex, swaps = {}) => {
  // Filter recipes for phase
  const phaseRecipes = recipes.filter(r => r.phaseKey === phaseKey);
  if (phaseRecipes.length === 0) return [];

  const breakfasts = phaseRecipes.filter(r => r.mealType === 'breakfast');
  const lunches = phaseRecipes.filter(r => r.mealType === 'lunch');
  const snacks = phaseRecipes.filter(r => r.mealType === 'snack');
  const dinners = phaseRecipes.filter(r => r.mealType === 'dinner');

  const getMealRecipe = (mealType, list) => {
    const swapKey = `${dayIndex}_${mealType}`;
    if (swaps[swapKey]) {
      const swapped = recipes.find(r => r.id === swaps[swapKey]);
      if (swapped) return swapped;
    }
    if (list.length === 0) return null;
    return list[dayIndex % list.length];
  };

  return [
    { time: 'breakfast', recipe: getMealRecipe('breakfast', breakfasts) },
    { time: 'lunch', recipe: getMealRecipe('lunch', lunches) },
    { time: 'snack', recipe: getMealRecipe('snack', snacks) },
    { time: 'dinner', recipe: getMealRecipe('dinner', dinners) }
  ].filter(item => item.recipe !== null);
};
