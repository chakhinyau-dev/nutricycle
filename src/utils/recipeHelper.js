import { FOODS_BY_PHASE } from './foodsData';

export const getMealKeyFoods = (phaseKey, mealType) => {
  const cats = FOODS_BY_PHASE[phaseKey] || FOODS_BY_PHASE.follicular;
  return cats
    .flatMap(cat => cat.items.map(item => ({ ...item, categoryKey: cat.categoryKey })))
    .filter(item => item.mealType === mealType)
    .slice(0, 3);
};

const sortByGoal = (list, userGoal) => {
  if (!userGoal) return list;
  return [...list].sort((a, b) => {
    const aMatch = a.goals?.includes(userGoal) ? 1 : 0;
    const bMatch = b.goals?.includes(userGoal) ? 1 : 0;
    return bMatch - aMatch;
  });
};

export const getVideosForDayAndPhase = (videos, phaseKey, dayIndex, swaps = {}, userGoal = null) => {
  const phaseVideos = videos.filter(v => v.phaseKey === phaseKey);
  const allVideos = phaseVideos.length > 0 ? phaseVideos : videos;

  const byMeal = (mealType) => sortByGoal(
    allVideos.filter(v => v.mealType === mealType),
    userGoal
  );

  const getVideo = (mealType, list) => {
    const swapKey = `${dayIndex}_${mealType}`;
    if (swaps[swapKey]) {
      const swapped = videos.find(v => v.id === swaps[swapKey]);
      if (swapped) return swapped;
    }
    if (list.length === 0) return null;
    return list[dayIndex % list.length];
  };

  return [
    { time: 'breakfast', video: getVideo('breakfast', byMeal('breakfast')) },
    { time: 'lunch',     video: getVideo('lunch',     byMeal('lunch'))     },
    { time: 'snack',     video: getVideo('snack',     byMeal('snack'))     },
    { time: 'dinner',    video: getVideo('dinner',    byMeal('dinner'))    },
  ].filter(item => item.video !== null);
};

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
