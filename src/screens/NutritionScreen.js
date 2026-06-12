import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, RefreshCw, Play, BookOpen, ShoppingBag, Clock, Plus, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getRecipesForDayAndPhase } from '../utils/recipeHelper';

const { width } = Dimensions.get('window');

const DAYS = [
  { index: 0, key: 'mon' },
  { index: 1, key: 'tue' },
  { index: 2, key: 'wed' },
  { index: 3, key: 'thu' },
  { index: 4, key: 'fri' },
  { index: 5, key: 'sat' },
  { index: 6, key: 'sun' }
];

export const NutritionScreen = ({
  onBack,
  onNavigate,
  recipes = [],
  currentPhaseKey = 'follicular',
  user,
}) => {
  const { t, i18n } = useTranslation();
  const userId = user?.id || 'guest';
  const phaseKey = currentPhaseKey || 'follicular';

  // Determine current day of week (0 = Mon, 6 = Sun)
  const defaultDay = useMemo(() => {
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    return day === 0 ? 6 : day - 1;
  }, []);

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [swaps, setSwaps] = useState({});
  const [activeSwapMeal, setActiveSwapMeal] = useState(null); // { mealType, currentRecipe }
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Load swaps from AsyncStorage
  useEffect(() => {
    const loadSwaps = async () => {
      try {
        const savedSwaps = await AsyncStorage.getItem(`@nutricycle_swaps_${userId}`);
        if (savedSwaps) {
          setSwaps(JSON.parse(savedSwaps));
        }
      } catch (e) {
        console.error('Error loading swaps:', e);
      }
    };
    loadSwaps();
  }, [userId]);

  // Save swaps to AsyncStorage
  const handleSelectSwap = async (alternativeRecipeId) => {
    if (!activeSwapMeal) return;

    const { mealType } = activeSwapMeal;
    const swapKey = `${selectedDay}_${mealType}`;
    const newSwaps = {
      ...swaps,
      [swapKey]: alternativeRecipeId
    };

    setSwaps(newSwaps);
    setShowSwapModal(false);
    setActiveSwapMeal(null);

    try {
      await AsyncStorage.setItem(`@nutricycle_swaps_${userId}`, JSON.stringify(newSwaps));
    } catch (e) {
      console.error('Error saving swaps:', e);
    }
  };

  // Get current day's meals
  const dailyMeals = useMemo(() => {
    return getRecipesForDayAndPhase(recipes, phaseKey, selectedDay, swaps);
  }, [recipes, phaseKey, selectedDay, swaps]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalTime = 0;

    dailyMeals.forEach(({ recipe }) => {
      if (recipe) {
        totalCalories += Number(recipe.calories || 0);
        totalProtein += Number(recipe.protein || recipe.calories ? Math.round(Number(recipe.calories) * 0.08) : 25); // estimate if missing
        totalTime += Number(recipe.time || 0);
      }
    });

    return {
      calories: totalCalories,
      protein: totalProtein,
      mealsCount: dailyMeals.length,
      time: totalTime
    };
  }, [dailyMeals]);

  // Get alternative recipes for swap modal
  const alternatives = useMemo(() => {
    if (!activeSwapMeal) return [];
    const { mealType, currentRecipe } = activeSwapMeal;
    
    // Filter recipes for current phase and same meal type, excluding current active recipe
    return recipes.filter(
      r => r.phaseKey === phaseKey && r.mealType === mealType && r.id !== currentRecipe.id
    ).slice(0, 3); // Get maximum 3 alternative recipes
  }, [recipes, phaseKey, activeSwapMeal]);

  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const isSpanish = currentLanguage?.toLowerCase().startsWith('es');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>
            {isSpanish ? 'Plan Nutricional' : 'Nutrition Plan'}
          </Text>
        </View>

        {/* Day of Week Selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorTitle}>
            {isSpanish ? 'Selecciona el día' : 'Select Day'}
          </Text>
          <View style={styles.daysStrip}>
            {DAYS.map((day) => {
              const isSelected = selectedDay === day.index;
              const isToday = day.index === defaultDay;
              
              // Get short day name from translation
              const shortName = t(`shopping.days.${day.key}.short`, { defaultValue: day.key.toUpperCase() });

              return (
                <Pressable
                  key={day.index}
                  style={[
                    styles.stripDayButton,
                    isSelected && styles.stripDayButtonActive,
                    isToday && !isSelected && styles.stripDayButtonToday
                  ]}
                  onPress={() => setSelectedDay(day.index)}
                >
                  <Text style={[
                    styles.stripDayLabel,
                    isSelected && styles.stripTextActive,
                    isToday && !isSelected && { color: colors.primary }
                  ]}>
                    {shortName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Summary Card */}
        {dailyMeals.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {isSpanish ? 'Resumen Diario' : 'Daily Summary'}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.calories} kcal</Text>
                <Text style={styles.statLabel}>{isSpanish ? 'Calorías' : 'Calories'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.protein}g</Text>
                <Text style={styles.statLabel}>{isSpanish ? 'Proteínas' : 'Protein'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.mealsCount}</Text>
                <Text style={styles.statLabel}>{isSpanish ? 'Comidas' : 'Meals'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.time} min</Text>
                <Text style={styles.statLabel}>{isSpanish ? 'Preparación' : 'Prep Time'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Meal List */}
        <View style={styles.mealList}>
          {dailyMeals.map(({ time, recipe }) => {
            if (!recipe) return null;

            const timeLabel = t(`dailylog.meal_types.${time}`);
            const hasVideo = recipe.videoUrl || recipe.youtubeUrl || false;

            return (
              <View key={time} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTimeTitle}>{timeLabel}</Text>
                  <Pressable
                    style={styles.swapBtn}
                    onPress={() => {
                      setActiveSwapMeal({ mealType: time, currentRecipe: recipe });
                      setShowSwapModal(true);
                    }}
                  >
                    <RefreshCw size={14} color={colors.secondary} style={{ marginRight: 6 }} />
                    <Text style={styles.swapBtnText}>
                      {isSpanish ? 'Cambiar' : 'Swap'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.recipeCardContent}
                  onPress={() => onNavigate('recipeDetail', recipe)}
                >
                  <View style={styles.imageContainer}>
                    <Image
                      source={typeof recipe.image === 'object' ? recipe.image : { uri: recipe.image }}
                      style={styles.recipeImage}
                      resizeMode="cover"
                    />
                    <View style={styles.timeTag}>
                      <Clock size={12} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.timeTagText}>{recipe.time} min</Text>
                    </View>
                    
                    {hasVideo && (
                      <View style={styles.playOverlay}>
                        <Play size={20} color="#FFF" fill="#FFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitleText}>{recipe.title}</Text>
                    <Text style={styles.recipeMacros}>
                      {(() => {
                        const prot = recipe.protein || Math.max(10, Math.round(recipe.calories * 0.08));
                        const fat = recipe.fat || Math.max(5, Math.round(recipe.calories * 0.035));
                        const carbs = recipe.carbs || Math.max(15, Math.round((recipe.calories - (prot * 4) - (fat * 9)) / 4));
                        return isSpanish
                          ? `${recipe.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g grasa`
                          : `${recipe.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g fat`;
                      })()}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Shortcuts Section */}
        <View style={styles.shortcutsGroup}>
          <Pressable 
            style={styles.shortcutCard}
            onPress={() => onNavigate('recipes')}
          >
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.shortcutText}>
              {isSpanish ? 'Explorar todas las recetas' : 'Browse All Recipes'}
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.shortcutCard, { marginTop: 12 }]}
            onPress={() => onNavigate('shoppingList')}
          >
            <ShoppingBag size={20} color={colors.secondary} />
            <Text style={styles.shortcutText}>
              {isSpanish ? 'Ver mi Lista de Compras' : 'View Shopping List'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Swap Alternatives Modal */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSpanish ? 'Intercambiar comida' : 'Swap Meal'}
              </Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  setShowSwapModal(false);
                  setActiveSwapMeal(null);
                }}
              >
                <X size={20} color={colors.on_surface} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalList}>
              <Text style={styles.modalSubtitle}>
                {isSpanish 
                  ? `Alternativas recomendadas para la fase ${t(`phases.${phaseKey}`)}:` 
                  : `Recommended options for ${t(`phases.${phaseKey}`)} phase:`}
              </Text>

              {alternatives.length === 0 ? (
                <View style={styles.emptyAlternatives}>
                  <Text style={styles.emptyAltText}>
                    {isSpanish 
                      ? 'No hay recetas alternativas disponibles para esta comida y fase.' 
                      : 'No alternative recipes available for this meal and phase.'}
                  </Text>
                </View>
              ) : (
                alternatives.map((altRecipe) => (
                  <Pressable
                    key={altRecipe.id}
                    style={styles.altCard}
                    onPress={() => handleSelectSwap(altRecipe.id)}
                  >
                    <Image
                      source={typeof altRecipe.image === 'object' ? altRecipe.image : { uri: altRecipe.image }}
                      style={styles.altImage}
                      resizeMode="cover"
                    />
                    <View style={styles.altInfo}>
                      <Text style={styles.altTitle}>{altRecipe.title}</Text>
                      <Text style={styles.altTime}>{altRecipe.time} min</Text>
                      <Text style={styles.altMacros}>
                        {(() => {
                          const prot = altRecipe.protein || Math.max(10, Math.round(altRecipe.calories * 0.08));
                          const fat = altRecipe.fat || Math.max(5, Math.round(altRecipe.calories * 0.035));
                          const carbs = altRecipe.carbs || Math.max(15, Math.round((altRecipe.calories - (prot * 4) - (fat * 9)) / 4));
                          return isSpanish
                            ? `${altRecipe.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g grasa`
                            : `${altRecipe.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g fat`;
                        })()}
                      </Text>
                    </View>
                    <View style={styles.selectAltBadge}>
                      <Plus size={16} color={colors.primary} />
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F2', // Cream Background (#F9F9F2)
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginBottom: 24,
  },
  selectorTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stripDayButton: {
    width: (width - 104) / 7,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  stripDayButtonActive: {
    backgroundColor: colors.primary, // Sage Green (#A3B3A5)
    borderColor: colors.primary,
  },
  stripDayButtonToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stripDayLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
  },
  stripTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginBottom: 32,
  },
  summaryTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.on_surface,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F1E8',
  },
  mealList: {
    gap: 24,
  },
  mealCard: {
    width: '100%',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTimeTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  swapBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.secondary,
  },
  recipeCardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#FAF9F6',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  timeTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeTagText: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInfo: {
    padding: 20,
  },
  recipeTitleText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 6,
  },
  recipeMacros: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
  shortcutsGroup: {
    marginTop: 40,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    gap: 12,
  },
  shortcutText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 68, 83, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9F9F2',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '80%',
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE4',
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: colors.on_surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  modalList: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginBottom: 20,
  },
  emptyAlternatives: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyAltText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    opacity: 0.6,
  },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginBottom: 16,
  },
  altImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#FAF9F6',
  },
  altInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  altTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
    marginBottom: 4,
  },
  altTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
  },
  altMacros: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
  selectAltBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
