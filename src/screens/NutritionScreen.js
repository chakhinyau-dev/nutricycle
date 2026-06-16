import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, RefreshCw, Play, BookOpen, ShoppingBag, Clock, Plus, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getRecipesForDayAndPhase } from '../utils/recipeHelper';
import { getRecipeVideoThumbnail } from '../services/recipeService';

const DAYS = [
  { index: 0, key: 'mon' },
  { index: 1, key: 'tue' },
  { index: 2, key: 'wed' },
  { index: 3, key: 'thu' },
  { index: 4, key: 'fri' },
  { index: 5, key: 'sat' },
  { index: 6, key: 'sun' }
];

const GRADIENT_STEPS = [0, 0.04, 0.1, 0.2, 0.35, 0.52, 0.68];

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

  const defaultDay = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [swaps, setSwaps] = useState({});
  const [activeSwapMeal, setActiveSwapMeal] = useState(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Calendar date numbers for the week strip
  const weekDates = useMemo(() => {
    const today = new Date();
    return DAYS.map(day => {
      const d = new Date(today);
      d.setDate(today.getDate() + (day.index - defaultDay));
      return d.getDate();
    });
  }, [defaultDay]);

  useEffect(() => {
    const loadSwaps = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@nutricycle_swaps_${userId}`);
        if (saved) setSwaps(JSON.parse(saved));
      } catch (e) {}
    };
    loadSwaps();
  }, [userId]);

  const handleSelectSwap = async (altId) => {
    if (!activeSwapMeal) return;
    const { mealType } = activeSwapMeal;
    const swapKey = `${selectedDay}_${mealType}`;
    const newSwaps = { ...swaps, [swapKey]: altId };
    setSwaps(newSwaps);
    setShowSwapModal(false);
    setActiveSwapMeal(null);
    try {
      await AsyncStorage.setItem(`@nutricycle_swaps_${userId}`, JSON.stringify(newSwaps));
    } catch (e) {}
  };

  const dailyMeals = useMemo(
    () => getRecipesForDayAndPhase(recipes, phaseKey, selectedDay, swaps),
    [recipes, phaseKey, selectedDay, swaps]
  );

  const stats = useMemo(() => {
    let totalCalories = 0, totalProtein = 0, totalTime = 0;
    dailyMeals.forEach(({ recipe }) => {
      if (recipe) {
        totalCalories += Number(recipe.calories || 0);
        totalProtein += Number(recipe.protein || Math.round(Number(recipe.calories) * 0.08));
        totalTime += Number(recipe.time || 0);
      }
    });
    return { calories: totalCalories, protein: totalProtein, mealsCount: dailyMeals.length, time: totalTime };
  }, [dailyMeals]);

  const alternatives = useMemo(() => {
    if (!activeSwapMeal) return [];
    const { mealType, currentRecipe } = activeSwapMeal;
    return recipes
      .filter(r => r.phaseKey === phaseKey && r.mealType === mealType && r.id !== currentRecipe.id)
      .slice(0, 3);
  }, [recipes, phaseKey, activeSwapMeal]);

  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const isSpanish = currentLanguage?.toLowerCase().startsWith('es');

  const getMacros = (recipe) => {
    const cal = Number(recipe.calories || 0);
    const prot = recipe.protein || Math.max(10, Math.round(cal * 0.08));
    const fat = recipe.fat || Math.max(5, Math.round(cal * 0.035));
    const carbs = recipe.carbs || Math.max(15, Math.round((cal - prot * 4 - fat * 9) / 4));
    return { cal, prot, fat, carbs };
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {isSpanish ? 'Plan Nutricional' : 'Nutrition Plan'}
            </Text>
            <View style={styles.phasePill}>
              <Text style={styles.phasePillText}>{t(`phases.${phaseKey}`)}</Text>
            </View>
          </View>
        </View>

        {/* ── Day Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daysScroll}
          contentContainerStyle={styles.daysStrip}
        >
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.index;
            const isToday = day.index === defaultDay;
            const shortName = t(`shopping.days.${day.key}.short`, { defaultValue: day.key.slice(0, 1).toUpperCase() });
            return (
              <Pressable
                key={day.index}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => setSelectedDay(day.index)}
              >
                <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
                  {shortName}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                  {weekDates[day.index]}
                </Text>
                {isToday && !isSelected && <View style={styles.todayDot} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginBottom: 28 }} />

        {/* ── Stats Card ── */}
        {dailyMeals.length > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statsCardTop}>
              <Text style={styles.statsPhaseLabel}>{t(`phases.${phaseKey}`).toUpperCase()}</Text>
              <Text style={styles.statsCardTitle}>
                {isSpanish ? 'Plan de hoy' : "Today's Plan"}
              </Text>
            </View>
            <View style={styles.statsRow}>
              {[
                { val: `${stats.calories}`, unit: 'kcal', label: isSpanish ? 'Calorías' : 'Calories' },
                { val: `${stats.protein}g`, unit: '', label: isSpanish ? 'Proteína' : 'Protein' },
                { val: `${stats.mealsCount}`, unit: '', label: isSpanish ? 'Comidas' : 'Meals' },
                { val: `${stats.time}`, unit: 'min', label: isSpanish ? 'Prep' : 'Prep' },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{s.val}</Text>
                    {s.unit ? <Text style={styles.statUnit}>{s.unit}</Text> : null}
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginBottom: 40 }} />

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>
          {isSpanish ? 'COMIDAS DEL DÍA' : 'MEALS OF THE DAY'}
        </Text>

        {/* ── Meal Cards ── */}
        <View style={styles.mealList}>
          {dailyMeals.map(({ time, recipe }) => {
            if (!recipe) return null;
            const timeLabel = t(`dailylog.meal_types.${time}`);
            const videoThumb = getRecipeVideoThumbnail(recipe);
            const hasVideo = !!(recipe.videoUrl || recipe.youtubeUrl || videoThumb);
            const { cal, prot, fat, carbs } = getMacros(recipe);

            return (
              <View key={time} style={styles.mealCard}>
                {/* Meal header */}
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTimeTitle}>{timeLabel}</Text>
                  <Pressable
                    style={styles.swapBtn}
                    onPress={() => {
                      setActiveSwapMeal({ mealType: time, currentRecipe: recipe });
                      setShowSwapModal(true);
                    }}
                  >
                    <RefreshCw size={13} color={colors.secondary} />
                    <Text style={styles.swapBtnText}>{isSpanish ? 'Cambiar' : 'Swap'}</Text>
                  </Pressable>
                </View>

                {/* Recipe card */}
                <Pressable
                  style={styles.recipeCard}
                  onPress={() => onNavigate('recipeDetail', recipe)}
                >
                  {/* Full-bleed video thumbnail with overlays */}
                  <View style={styles.imageWrap}>
                    <Image
                      source={videoThumb
                        ? { uri: videoThumb }
                        : typeof recipe.image === 'object' ? recipe.image : { uri: recipe.image }}
                      style={styles.recipeImage}
                      resizeMode="cover"
                    />

                    {/* Time tag */}
                    <View style={styles.timeTag}>
                      <Clock size={10} color="#FFF" />
                      <Text style={styles.timeTagText}>{recipe.time} min</Text>
                    </View>

                    {/* Play button */}
                    {hasVideo && (
                      <View style={styles.playBtn}>
                        <Play size={18} color="#FFF" fill="#FFF" />
                      </View>
                    )}

                    {/* Pseudo-gradient overlay + title */}
                    <View style={styles.gradientOverlay} pointerEvents="none">
                      {GRADIENT_STEPS.map((opacity, i) => (
                        <View
                          key={i}
                          style={{ flex: 1, backgroundColor: `rgba(26,20,35,${opacity})` }}
                        />
                      ))}
                    </View>
                    <View style={styles.overlayTitle} pointerEvents="none">
                      <Text style={styles.recipeNameOverlay} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                    </View>
                  </View>

                  {/* Macro chips */}
                  <View style={styles.macroRow}>
                    <View style={[styles.macroPill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.macroPillText, { color: '#D97706' }]}>{cal} kcal</Text>
                    </View>
                    <View style={[styles.macroPill, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.macroPillText, { color: '#16A34A' }]}>{prot}g prot</Text>
                    </View>
                    <View style={[styles.macroPill, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.macroPillText, { color: '#2563EB' }]}>{carbs}g carb</Text>
                    </View>
                    <View style={[styles.macroPill, { backgroundColor: '#FCE7F3' }]}>
                      <Text style={[styles.macroPillText, { color: '#DB2777' }]}>
                        {fat}g {isSpanish ? 'grasa' : 'fat'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ── Shortcuts ── */}
        <View style={styles.shortcutsRow}>
          <Pressable
            style={[styles.shortcutCard, { backgroundColor: '#EBF2EB' }]}
            onPress={() => onNavigate('recipes')}
          >
            <BookOpen size={20} color={colors.primary} />
            <Text style={[styles.shortcutText, { color: colors.primary }]}>
              {isSpanish ? 'Recetas' : 'Recipes'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.shortcutCard, { backgroundColor: '#EDE8F5' }]}
            onPress={() => onNavigate('shoppingList')}
          >
            <ShoppingBag size={20} color={colors.secondary} />
            <Text style={[styles.shortcutText, { color: colors.secondary }]}>
              {isSpanish ? 'Compras' : 'Shopping'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ── Swap Modal ── */}
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
                onPress={() => { setShowSwapModal(false); setActiveSwapMeal(null); }}
              >
                <X size={20} color={colors.on_surface} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalList}>
              <Text style={styles.modalSubtitle}>
                {isSpanish
                  ? `Alternativas para la fase ${t(`phases.${phaseKey}`)}:`
                  : `Options for ${t(`phases.${phaseKey}`)} phase:`}
              </Text>

              {alternatives.length === 0 ? (
                <View style={styles.emptyAlternatives}>
                  <Text style={styles.emptyAltText}>
                    {isSpanish
                      ? 'No hay recetas alternativas disponibles.'
                      : 'No alternative recipes available.'}
                  </Text>
                </View>
              ) : (
                alternatives.map((alt) => {
                  const m = getMacros(alt);
                  return (
                    <Pressable
                      key={alt.id}
                      style={styles.altCard}
                      onPress={() => handleSelectSwap(alt.id)}
                    >
                      <Image
                        source={typeof alt.image === 'object' ? alt.image : { uri: alt.image }}
                        style={styles.altImage}
                        resizeMode="cover"
                      />
                      <View style={styles.altInfo}>
                        <Text style={styles.altTitle}>{alt.title}</Text>
                        <Text style={styles.altTime}>{alt.time} min</Text>
                        <Text style={styles.altMacros}>
                          {isSpanish
                            ? `${m.cal} kcal · ${m.prot}g prot · ${m.carbs}g carb`
                            : `${m.cal} kcal · ${m.prot}g prot · ${m.carbs}g carb`}
                        </Text>
                      </View>
                      <View style={styles.selectAltBadge}>
                        <Plus size={16} color={colors.primary} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F2' },
  scrollContent: { paddingTop: 60 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    lineHeight: 36,
  },
  phasePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary_container,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  phasePillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_primary_container,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Day strip
  daysScroll: { paddingLeft: 20 },
  daysStrip: { paddingRight: 24, gap: 6 },
  dayPill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 22,
    minWidth: 50,
  },
  dayPillActive: { backgroundColor: '#A3B3A5' },
  dayLetter: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 5,
    opacity: 0.55,
  },
  dayLetterActive: { color: 'rgba(255,255,255,0.55)', opacity: 1 },
  dayNum: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.on_surface,
  },
  dayNumActive: { color: '#FFFFFF' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 5,
  },

  // Stats card
  statsCard: {
    marginHorizontal: 24,
    backgroundColor: '#A3B3A5',
    borderRadius: 28,
    padding: 24,
  },
  statsCardTop: { marginBottom: 22 },
  statsPhaseLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statsCardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  statUnit: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    marginBottom: 5,
  },
  statLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Section label
  sectionLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  // Meal cards
  mealList: { gap: 40, paddingHorizontal: 24 },
  mealCard: {},
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mealTimeTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: colors.on_surface,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  swapBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.secondary,
  },

  recipeCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  imageWrap: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  timeTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeTagText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -26,
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    flexDirection: 'column',
  },
  overlayTitle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  recipeNameOverlay: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 28,
  },

  // Macro chips
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  macroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  macroPillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
  },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 44,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  shortcutText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74,68,83,0.4)',
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
  },
});
