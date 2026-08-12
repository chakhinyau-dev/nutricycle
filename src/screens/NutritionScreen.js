import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Play, ShoppingBag, Utensils, Crown, RefreshCw, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FOODS_BY_PHASE } from '../utils/foodsData';
import { getCyclePhaseKey } from '../utils/cycle';
import { getRecipeMacros } from '../utils/nutrition';

const DAYS = [
  { index: 0, key: 'mon' },
  { index: 1, key: 'tue' },
  { index: 2, key: 'wed' },
  { index: 3, key: 'thu' },
  { index: 4, key: 'fri' },
  { index: 5, key: 'sat' },
  { index: 6, key: 'sun' },
];

const ALL_MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

const MEAL_EMOJIS = {
  breakfast: '🥣',
  lunch: '🥗',
  snack: '🫐',
  dinner: '🐟',
};

// Turns a strip day index into its actual day-in-cycle number, reused by both
// the week-strip coloring and the selected-day phase, so both always agree
// with each other and with getCyclePhaseKey — the same formula
// Dashboard/Calendar use. This used to be a separate, hand-rolled formula
// duplicated per-usage, which could disagree with the rest of the app about
// which phase a given day was in.
const cycleDayForStripIndex = (dayIndex, defaultDay, cycleLen, todayCycleDay) => {
  const offset = dayIndex - defaultDay;
  return ((todayCycleDay - 1 + offset + cycleLen * 2) % cycleLen) + 1;
};



const MACRO_COLORS = {
  p: { bg: '#EBF3EC', text: '#4A7D5A' },
  c: { bg: '#EDEAF4', text: '#7A6D95' },
  g: { bg: '#F4EFE6', text: '#8A6B40' },
  f: { bg: '#E8F1F4', text: '#4A7A90' },
};

const PHASE_COLORS = {
  menstrual:  '#F2C4C4',
  follicular: '#B8D8BC',
  ovulation:  '#F9E4B7',
  luteal:     '#C8BCE0',
};

const CATEGORY_COLORS = {
  proteins:   '#E8A0A2',
  fats:       '#D4A853',
  carbs:      '#B0A0D4',
  veg_fruits: '#94C49A',
  grains:     '#C4A572',
  extras:     '#ADB5BD',
  herbs:      '#9CAF88',
};

export const NutritionScreen = ({
  onBack,
  onNavigate,
  videos = [],
  recipes = [],
  currentPhaseKey = 'follicular',
  cycleDay,
  user,
  cycleProfile = {},
  isLocked = false,
  onSubscribe,
}) => {
  const { t } = useTranslation();
  const userId = user?.id || 'guest';
const defaultDay = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const dayStripRef = useRef(null);
  const [swaps, setSwaps] = useState({});
  const [activeSwapMeal, setActiveSwapMeal] = useState(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const weekDates = useMemo(() => {
    const today = new Date();
    return DAYS.map(day => {
      const d = new Date(today);
      d.setDate(today.getDate() + (day.index - defaultDay));
      return d.getDate();
    });
  }, [defaultDay]);

  // Which cycle phase each strip day falls in (for the colored bar)
  const weekDayPhases = useMemo(() => {
    const cycleLen = cycleProfile?.cycleLength || 28;
    const periodLen = cycleProfile?.periodLength || 5;
    const todayCycleDay = cycleDay || 1;
    return DAYS.map(day =>
      getCyclePhaseKey(cycleDayForStripIndex(day.index, defaultDay, cycleLen, todayCycleDay), cycleLen, periodLen)
    );
  }, [cycleDay, cycleProfile, defaultDay]);

  // The phase (and day-in-cycle) for whichever day is currently selected in
  // the strip — NOT necessarily today. Selecting a different day now actually
  // previews that day's phase-appropriate meal plan, instead of always
  // showing today's phase regardless of which day pill is tapped.
  const selectedDayInfo = useMemo(() => {
    const cycleLen = cycleProfile?.cycleLength || 28;
    const periodLen = cycleProfile?.periodLength || 5;
    const todayCycleDay = cycleDay || 1;
    const dayInCycle = cycleDayForStripIndex(selectedDay, defaultDay, cycleLen, todayCycleDay);
    return {
      cycleDay: dayInCycle,
      phaseKey: getCyclePhaseKey(dayInCycle, cycleLen, periodLen),
    };
  }, [cycleDay, cycleProfile, selectedDay, defaultDay]);

  const phaseKey = selectedDayInfo.phaseKey || currentPhaseKey || 'follicular';

  // Top 3 foods for today's phase (shown in the focus card)
  const phaseKeyFoods = useMemo(() => {
    const cats = FOODS_BY_PHASE[phaseKey] || FOODS_BY_PHASE.follicular;
    return cats
      .flatMap(cat => cat.items.map(item => ({ ...item, categoryKey: cat.categoryKey })))
      .slice(0, 3);
  }, [phaseKey]);


  // Load saved swaps from storage
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@nutricycle_swaps_${userId}`);
        if (saved) setSwaps(JSON.parse(saved));
      } catch (e) {}
    };
    load();
  }, [userId]);

  const handleSelectSwap = async (videoId) => {
    if (!activeSwapMeal) return;
    const swapKey  = `${selectedDay}_${activeSwapMeal}`;
    const newSwaps = { ...swaps, [swapKey]: videoId };
    setSwaps(newSwaps);
    setShowSwapModal(false);
    setActiveSwapMeal(null);
    try {
      await AsyncStorage.setItem(`@nutricycle_swaps_${userId}`, JSON.stringify(newSwaps));
    } catch (e) {}
  };

  // Per-slot prime offsets so each meal type independently rotates through its candidates
  const SLOT_OFFSETS = { breakfast: 0, lunch: 3, snack: 5, dinner: 2 };

  // Recipes assigned to each meal slot — apply any saved swaps
  const mealRecipes = useMemo(() => {
    const map = {};
    ALL_MEAL_SLOTS.forEach(slot => {
      const candidates = recipes.filter(r =>
        (r.phaseKey || r.phase_key) === phaseKey &&
        (r.mealType || r.meal_type) === slot
      );
      if (candidates.length === 0) {
        map[slot] = null;
      } else {
        const swapKey   = `${selectedDay}_${slot}`;
        const swappedId = swaps[swapKey];
        const swapped   = swappedId ? candidates.find(r => String(r.id) === swappedId) : null;
        if (swapped) {
          map[slot] = swapped;
        } else {
          const idx = (selectedDay + (SLOT_OFFSETS[slot] || 0)) % candidates.length;
          map[slot] = candidates[idx];
        }
      }
    });
    return map;
  }, [recipes, phaseKey, selectedDay, swaps]);

  const dailyTotals = useMemo(() => {
    const vals = Object.values(mealRecipes).filter(Boolean);
    return vals.reduce((acc, r) => {
      const m = getRecipeMacros(r);
      return {
        calories: acc.calories + (r.calories || 0),
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        fiber: acc.fiber + m.fiber,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }, [mealRecipes]);

  // Alternative recipes for the swap modal
  const alternatives = useMemo(() => {
    if (!activeSwapMeal) return [];
    const current = mealRecipes[activeSwapMeal];
    return recipes.filter(r =>
      (r.phaseKey || r.phase_key) === phaseKey &&
      (r.mealType || r.meal_type) === activeSwapMeal &&
      String(r.id) !== String(current?.id)
    );
  }, [recipes, phaseKey, activeSwapMeal, mealRecipes]);

  const phaseColor = PHASE_COLORS[phaseKey] || colors.primary;

  // --- Animations ---
  const dayAnims = useRef(
    DAYS.map(() => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(14),
      scale:      new Animated.Value(1),
    }))
  ).current;

  const focusOpacity    = useRef(new Animated.Value(0)).current;
  const focusTranslateY = useRef(new Animated.Value(28)).current;

  // Meal slot stagger (4 slots)
  const mealSlotAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(28),
      scale:      new Animated.Value(0.95),
    }))
  ).current;

  // Section label reveal
  const sectionLabelOpacity    = useRef(new Animated.Value(0)).current;
  const sectionLabelTranslateY = useRef(new Animated.Value(12)).current;

  // Scroll day strip so today is always visible (centered with 2 days before it)
  useEffect(() => {
    if (defaultDay > 2) {
      const PILL_W = 58; // minWidth 52 + gap 6
      const scrollX = (defaultDay - 2) * PILL_W;
      setTimeout(() => {
        dayStripRef.current?.scrollTo({ x: scrollX, animated: false });
      }, 60);
    }
  }, [defaultDay]);

  // Day pills stagger-in on mount + section label + meal slots
  useEffect(() => {
    Animated.stagger(55, dayAnims.map(a =>
      Animated.parallel([
        Animated.timing(a.opacity,    { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(a.translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ])
    )).start();

    // Section label fades in after pills
    Animated.sequence([
      Animated.delay(420),
      Animated.parallel([
        Animated.timing(sectionLabelOpacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(sectionLabelTranslateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    // Meal slots stagger up after label
    Animated.sequence([
      Animated.delay(550),
      Animated.stagger(80, mealSlotAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
          Animated.spring(a.scale,    { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, []);

  // Focus card + meal slots re-animate on day change
  useEffect(() => {
    focusOpacity.setValue(0);
    focusTranslateY.setValue(22);
    Animated.parallel([
      Animated.timing(focusOpacity,    { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(focusTranslateY, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();

    // Reset and re-stagger meal slots
    mealSlotAnims.forEach(a => {
      a.opacity.setValue(0);
      a.translateY.setValue(28);
      a.scale.setValue(0.95);
    });
    Animated.sequence([
      Animated.delay(160),
      Animated.stagger(70, mealSlotAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
          Animated.spring(a.scale,    { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, [selectedDay]);

  const handleDayPressIn  = (i) => Animated.spring(dayAnims[i].scale, { toValue: 0.90, useNativeDriver: true }).start();
  const handleDayPressOut = (i) => Animated.spring(dayAnims[i].scale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('nutrition.title')}</Text>
            <View style={styles.headerMeta}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={styles.headerMetaText}>
                {t(`phases.${phaseKey}`)}
                {selectedDayInfo.cycleDay ? ` · ${t('nutrition.day_label')} ${selectedDayInfo.cycleDay}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Day Strip with phase color bars ── */}
        <ScrollView
          ref={dayStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daysScroll}
          contentContainerStyle={styles.daysStrip}
        >
          {DAYS.map((day) => {
            const isSelected    = selectedDay === day.index;
            const isToday       = day.index === defaultDay;
            const shortName     = t(`shopping.days.${day.key}.short`, { defaultValue: day.key.slice(0, 1).toUpperCase() });
            const dayPhaseColor = PHASE_COLORS[weekDayPhases[day.index]];
            const anim = dayAnims[day.index];

            return (
              <Animated.View
                key={day.index}
                style={{
                  opacity:   anim.opacity,
                  transform: [{ translateY: anim.translateY }, { scale: anim.scale }],
                }}
              >
                <Pressable
                  style={[styles.dayPill, isSelected && styles.dayPillActive]}
                  onPress={() => setSelectedDay(day.index)}
                  onPressIn={() => handleDayPressIn(day.index)}
                  onPressOut={() => handleDayPressOut(day.index)}
                >
                  {!isSelected && (
                    <View style={[styles.dayPhaseBar, { backgroundColor: dayPhaseColor }]} />
                  )}
                  <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
                    {shortName}
                  </Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                    {weekDates[day.index]}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={{ marginBottom: 28 }} />

        {/* ── Phase Focus Card ── */}
        <Animated.View style={[styles.focusCard, { backgroundColor: phaseColor, opacity: focusOpacity, transform: [{ translateY: focusTranslateY }] }]}>
          <Text style={styles.focusOverline}>{t('nutrition.phase_focus_label')}</Text>
          <Text style={styles.focusTitle}>{t(`phases_data.${phaseKey}.focus`)}</Text>
          <Text style={styles.focusAdvice}>
            {t(`phases_data.${phaseKey}.advice`)}
          </Text>
          <View style={styles.focusFoodsRow}>
            {phaseKeyFoods.map(food => (
              <View key={food.key} style={styles.focusFoodChip}>
                <View style={[styles.focusFoodDot, { backgroundColor: CATEGORY_COLORS[food.categoryKey] }]} />
                <Text style={styles.focusFoodText} numberOfLines={1}>
                  {t(`key_foods.items.${food.key}.name`)}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ marginBottom: 36 }} />

        {/* ── Section label ── */}
        <Animated.Text style={[styles.sectionLabel, { opacity: sectionLabelOpacity, transform: [{ translateY: sectionLabelTranslateY }] }]}>
          {t('nutrition.meals_of_day')}
        </Animated.Text>

        {/* ── Meal Slots ── */}
        <View style={styles.mealList}>
          {ALL_MEAL_SLOTS.map((time, slotIndex) => {
            const recipe    = mealRecipes[time];
            const macros    = getRecipeMacros(recipe || {});
            const timeLabel = t(`dailylog.meal_types.${time}`).toUpperCase();
            const sa        = mealSlotAnims[slotIndex];

            return (
              <Animated.View key={time} style={[styles.mealSlot, { opacity: sa.opacity, transform: [{ translateY: sa.translateY }, { scale: sa.scale }] }]}>

                {/* Meal time header */}
                <View style={styles.mealTimeRow}>
                  <Text style={styles.mealTypeLabel} numberOfLines={1} adjustsFontSizeToFit>{timeLabel}</Text>
                  <Text style={styles.mealTimeText}>
                    {t(`nutrition.meal_times.${time}`, { defaultValue: '' })}
                  </Text>
                </View>

                {recipe ? (
                  <View style={styles.mealRecipeCard}>
                    <View style={styles.mealRecipeEmoji}>
                      <Text style={styles.mealRecipeEmojiText}>{MEAL_EMOJIS[time]}</Text>
                    </View>
                    <View style={styles.mealRecipeInfo}>
                      <Text style={styles.mealRecipeName} numberOfLines={2}>{recipe.title}</Text>
                      <View style={styles.macroChipsRow}>
                        <View style={[styles.macroChip, { backgroundColor: '#F5F5EF' }]}>
                          <Text style={[styles.macroChipText, { color: colors.on_surface_variant }]}>{recipe.calories} kcal</Text>
                        </View>
                        {[
                          { key: 'p', label: `P ${macros.protein}g` },
                          { key: 'c', label: `C ${macros.carbs}g` },
                          { key: 'g', label: `G ${macros.fat}g` },
                          { key: 'f', label: `F ${macros.fiber}g` },
                        ].map(m => (
                          <View key={m.key} style={[styles.macroChip, { backgroundColor: MACRO_COLORS[m.key].bg }]}>
                            <Text style={[styles.macroChipText, { color: MACRO_COLORS[m.key].text }]}>{m.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {/* Swap button */}
                    <Pressable
                      style={styles.swapBtn}
                      onPress={() => { setActiveSwapMeal(time); setShowSwapModal(true); }}
                    >
                      <RefreshCw size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.emptyMealCard} onPress={() => onNavigate('recipes')}>
                    <Utensils size={22} color={colors.on_surface_variant} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <Text style={styles.emptyMealText}>{t('nutrition.empty_meal')}</Text>
                    <Text style={styles.emptyMealSub}>{t('nutrition.empty_meal_sub')}</Text>
                  </Pressable>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* ── Total del día ── */}
        {dailyTotals.calories > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('nutrition.total_day', { defaultValue: 'TOTAL DEL DÍA' })}</Text>
            <View style={styles.totalChipsRow}>
              <View style={[styles.macroChip, { backgroundColor: '#F5F5EF' }]}>
                <Text style={[styles.macroChipText, { color: colors.on_surface_variant }]}>{dailyTotals.calories} kcal</Text>
              </View>
              {[
                { key: 'p', label: `P ${dailyTotals.protein}g` },
                { key: 'c', label: `C ${dailyTotals.carbs}g` },
                { key: 'g', label: `G ${dailyTotals.fat}g` },
                { key: 'f', label: `F ${dailyTotals.fiber}g` },
              ].map(m => (
                <View key={m.key} style={[styles.macroChip, { backgroundColor: MACRO_COLORS[m.key].bg }]}>
                  <Text style={[styles.macroChipText, { color: MACRO_COLORS[m.key].text }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Shortcuts ── */}
        <View style={styles.shortcutsRow}>
          <Pressable
            style={[styles.shortcutCard, { backgroundColor: '#EBF2EB' }]}
            onPress={() => onNavigate('videos')}
          >
            <Play size={20} color={colors.primary} />
            <Text style={[styles.shortcutText, { color: colors.primary }]}>
              {t('nutrition.videos_shortcut')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.shortcutCard, { backgroundColor: '#EDE8F5' }]}
            onPress={() => onNavigate('shoppingList')}
          >
            <ShoppingBag size={20} color={colors.secondary} />
            <Text style={[styles.shortcutText, { color: colors.secondary }]}>
              {t('nutrition.shopping_shortcut')}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>


      {/* ── Swap Modal ── */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowSwapModal(false); setActiveSwapMeal(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('nutrition.swap_title')}</Text>
              <Pressable onPress={() => { setShowSwapModal(false); setActiveSwapMeal(null); }}>
                <X size={20} color={colors.on_surface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalList}>
              <Text style={styles.modalSubtitle}>
                {t('nutrition.swap_subtitle', { phase: t(`phases.${phaseKey}`) })}
              </Text>
              {alternatives.length === 0 ? (
                <View style={styles.emptyAlternatives}>
                  <Text style={styles.emptyAltText}>{t('nutrition.no_alternatives')}</Text>
                </View>
              ) : (
                alternatives.map(alt => {
                  const altMacros = getRecipeMacros(alt);
                  return (
                    <Pressable key={alt.id} style={styles.altCard} onPress={() => handleSelectSwap(String(alt.id))}>
                      <View style={styles.altInfo}>
                        <Text style={styles.altTitle} numberOfLines={2}>{alt.title}</Text>
                        <View style={styles.macroChipsRow}>
                          <View style={[styles.macroChip, { backgroundColor: '#F5F5EF' }]}>
                            <Text style={[styles.macroChipText, { color: colors.on_surface_variant }]}>{alt.calories} kcal</Text>
                          </View>
                          {[
                            { key: 'p', label: `P ${altMacros.protein}g` },
                            { key: 'c', label: `C ${altMacros.carbs}g` },
                          ].map(m => (
                            <View key={m.key} style={[styles.macroChip, { backgroundColor: MACRO_COLORS[m.key].bg }]}>
                              <Text style={[styles.macroChipText, { color: MACRO_COLORS[m.key].text }]}>{m.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {isLocked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockCard}>
            <View style={styles.lockIconCircle}>
              <Crown size={32} color="#FFF" fill="#FFD700" />
            </View>
            <Text style={styles.lockTitle}>{t('subscription.unlock_nutrition_title')}</Text>
            <Text style={styles.lockSubtitle}>{t('subscription.unlock_nutrition_desc')}</Text>
            <Pressable style={styles.subscribeBtn} onPress={onSubscribe}>
              <Text style={styles.subscribeBtnText}>{t('subscription.unlock_nutrition_btn').toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F9F9F2' },
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
  overline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    opacity: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 36,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  phaseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerMetaText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.75,
  },

  // Day strip
  daysScroll: { paddingLeft: 20 },
  daysStrip:  { paddingRight: 24, gap: 6 },
  dayPill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: 22,
    minWidth: 52,
  },
  dayPillActive: { backgroundColor: '#A3B3A5' },
  dayPhaseBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  dayLetter: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 7,
    marginBottom: 5,
    opacity: 0.55,
  },
  dayLetterActive: { color: 'rgba(255,255,255,0.55)', opacity: 1, marginTop: 0 },
  dayNum: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
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

  // Phase Focus card
  focusCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
  },
  focusOverline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(74,68,83,0.55)',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  focusTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: '#4A4453',
    marginBottom: 8,
  },
  focusAdvice: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(74,68,83,0.70)',
    lineHeight: 19,
    marginBottom: 18,
  },
  focusFoodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusFoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  focusFoodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  focusFoodText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#4A4453',
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

  // Meal slots
  mealList: { gap: 32, paddingHorizontal: 20 },
  mealSlot:  {},

  mealTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  mealTimeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.5,
  },
  mealTypeLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1,
    opacity: 0.7,
  },

  // Video card
  recipeCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    alignSelf: 'stretch',
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
  mealBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mealBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mealBadgeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
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

  // Key ingredients
  ingredientsBox: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  ingredientsLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    opacity: 0.45,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  ingredientChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  ingredientChipText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface,
  },

  // Video card
  mealVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  thumbWrapper: {
    width: 80,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0EEE8',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -14,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealVideoInfo: {
    flex: 1,
    gap: 4,
  },
  mealVideoTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.on_surface,
    lineHeight: 20,
  },
  mealVideoDuration: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.6,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EDF6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Empty slot
  emptyMealCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#DEDBD3',
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#FAFAF6',
  },
  emptyMealText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.on_surface_variant,
    opacity: 0.55,
    marginBottom: 4,
  },
  emptyMealSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.primary,
    opacity: 0.8,
  },

  // Recipe card
  mealRecipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  mealRecipeEmoji: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F4F2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealRecipeEmojiText: {
    fontSize: 26,
  },
  mealRecipeInfo: {
    flex: 1,
    gap: 4,
  },
  mealRecipeName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface,
    lineHeight: 20,
  },
  mealRecipeMacros: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.75,
  },
  macroChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  macroChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  macroChipText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
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
  selectAltBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F0F0E8',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 12,
  },
  totalLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  totalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },

  // Paywall
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 242, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  lockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#968DA1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E8E2F0',
  },
  lockIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEE9F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: 12,
  },
  lockSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    opacity: 0.8,
  },
  subscribeBtn: {
    width: '100%',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  subscribeBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});
