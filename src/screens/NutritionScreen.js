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
import { ChevronLeft, RefreshCw, Play, ShoppingBag, Plus, X, Utensils } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getVideosForDayAndPhase, getMealKeyFoods } from '../utils/recipeHelper';
import { FOODS_BY_PHASE } from '../utils/foodsData';

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

const GRADIENT_STEPS = [0, 0.04, 0.1, 0.2, 0.35, 0.52, 0.68];

const PHASE_COLORS = {
  menstrual:  '#E07878',
  follicular: '#6EA87B',
  ovulation:  '#6BA8C9',
  luteal:     '#C9A227',
};

const CATEGORY_COLORS = {
  proteins:   '#E8845A',
  fats:       '#D4A853',
  carbs:      '#8B9DC3',
  veg_fruits: '#6EA87B',
};

export const NutritionScreen = ({
  onBack,
  onNavigate,
  videos = [],
  currentPhaseKey = 'follicular',
  cycleDay,
  user,
  cycleProfile = {},
}) => {
  const { t } = useTranslation();
  const userId = user?.id || 'guest';
  const phaseKey = currentPhaseKey || 'follicular';
  const userGoal = cycleProfile?.goal || 'balance';

  const defaultDay = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  const [selectedDay, setSelectedDay] = useState(defaultDay);
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
    const fertileStart = cycleLen - 16;
    const fertileEnd   = cycleLen - 11;
    const currentDay   = cycleDay || 1;
    return DAYS.map(day => {
      const offset    = day.index - defaultDay;
      const targetDay = ((currentDay + offset - 1 + cycleLen * 2) % cycleLen) + 1;
      if (targetDay <= periodLen)                          return 'menstrual';
      if (targetDay >= fertileStart && targetDay <= fertileEnd) return 'ovulation';
      if (targetDay > fertileEnd)                          return 'luteal';
      return 'follicular';
    });
  }, [cycleDay, cycleProfile, defaultDay]);

  // Top 3 foods for today's phase (shown in the focus card)
  const phaseKeyFoods = useMemo(() => {
    const cats = FOODS_BY_PHASE[phaseKey] || FOODS_BY_PHASE.follicular;
    return cats
      .flatMap(cat => cat.items.map(item => ({ ...item, categoryKey: cat.categoryKey })))
      .slice(0, 3);
  }, [phaseKey]);

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
    const swapKey  = `${selectedDay}_${mealType}`;
    const newSwaps = { ...swaps, [swapKey]: altId };
    setSwaps(newSwaps);
    setShowSwapModal(false);
    setActiveSwapMeal(null);
    try {
      await AsyncStorage.setItem(`@nutricycle_swaps_${userId}`, JSON.stringify(newSwaps));
    } catch (e) {}
  };

  // Always render all 4 meal slots; null video → empty state
  const dailyVideos = useMemo(() => {
    const found = getVideosForDayAndPhase(videos, phaseKey, selectedDay, swaps, userGoal);
    return ALL_MEAL_SLOTS.map(time => ({
      time,
      video: found.find(f => f.time === time)?.video || null,
    }));
  }, [videos, phaseKey, selectedDay, swaps, userGoal]);

  const alternatives = useMemo(() => {
    if (!activeSwapMeal || !videos?.length) return [];
    const { mealType, currentVideo } = activeSwapMeal;
    return videos
      .filter(v => v.phaseKey === phaseKey && v.mealType === mealType && v.id !== currentVideo?.id)
      .slice(0, 3);
  }, [videos, phaseKey, activeSwapMeal]);

  const phaseColor = PHASE_COLORS[phaseKey] || colors.primary;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{t('nutrition.overline')}</Text>
            <Text style={styles.title}>{t('nutrition.title')}</Text>
            <View style={styles.headerMeta}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={styles.headerMetaText}>
                {t(`phases.${phaseKey}`)}
                {cycleDay ? ` · ${t('nutrition.day_label')} ${cycleDay}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Day Strip with phase color bars ── */}
        <ScrollView
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

            return (
              <Pressable
                key={day.index}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => setSelectedDay(day.index)}
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
            );
          })}
        </ScrollView>

        <View style={{ marginBottom: 28 }} />

        {/* ── Phase Focus Card ── */}
        <View style={[styles.focusCard, { backgroundColor: phaseColor }]}>
          <Text style={styles.focusOverline}>{t('nutrition.phase_focus_label')}</Text>
          <Text style={styles.focusTitle}>{t(`phases_data.${phaseKey}.focus`)}</Text>
          <Text style={styles.focusAdvice} numberOfLines={2}>
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
        </View>

        <View style={{ marginBottom: 36 }} />

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>{t('nutrition.meals_of_day')}</Text>

        {/* ── Meal Slots ── */}
        <View style={styles.mealList}>
          {dailyVideos.map(({ time, video }) => {
            const mealKeyFoods = getMealKeyFoods(phaseKey, time);
            const timeLabel    = t(`dailylog.meal_types.${time}`).toUpperCase();

            return (
              <View key={time} style={styles.mealSlot}>

                {/* Meal time header */}
                <View style={styles.mealTimeRow}>
                  <Text style={styles.mealTimeText}>
                    {t(`nutrition.meal_times.${time}`, { defaultValue: '' })}
                  </Text>
                  <Text style={styles.mealTypeLabel}>{timeLabel}</Text>
                </View>

                {video ? (
                  <>
                    {/* Video card */}
                    <Pressable style={styles.recipeCard} onPress={() => onNavigate('videos')}>
                      <View style={styles.imageWrap}>
                        <Image
                          source={{ uri: video.thumbnail }}
                          style={styles.recipeImage}
                          resizeMode="cover"
                        />
                        <View style={styles.mealBadge}>
                          <Text style={styles.mealBadgeText}>{timeLabel}</Text>
                          <View style={styles.mealBadgeDot} />
                          <Text style={styles.mealBadgeText}>{video.duration}</Text>
                        </View>
                        <View style={styles.playBtn}>
                          <Play size={18} color="#FFF" fill="#FFF" />
                        </View>
                        <Pressable
                          style={styles.swapBtn}
                          onPress={() => {
                            setActiveSwapMeal({ mealType: time, currentVideo: video });
                            setShowSwapModal(true);
                          }}
                        >
                          <RefreshCw size={13} color="#FFF" />
                        </Pressable>
                        <View style={styles.gradientOverlay} pointerEvents="none">
                          {GRADIENT_STEPS.map((opacity, i) => (
                            <View key={i} style={{ flex: 1, backgroundColor: `rgba(26,20,35,${opacity})` }} />
                          ))}
                        </View>
                        <View style={styles.overlayTitle} pointerEvents="none">
                          <Text style={styles.recipeNameOverlay} numberOfLines={2}>
                            {video.title}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {/* Key ingredient chips */}
                    {mealKeyFoods.length > 0 && (
                      <View style={styles.ingredientsBox}>
                        <Text style={styles.ingredientsLabel}>{t('nutrition.key_ingredients')}</Text>
                        <View style={styles.ingredientChips}>
                          {mealKeyFoods.map(food => (
                            <View
                              key={food.key}
                              style={[styles.ingredientChip, { borderLeftColor: CATEGORY_COLORS[food.categoryKey] }]}
                            >
                              <Text style={styles.ingredientChipText}>
                                {t(`key_foods.items.${food.key}.name`)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  /* Empty slot */
                  <Pressable style={styles.emptyMealCard} onPress={() => onNavigate('videos')}>
                    <Utensils size={22} color={colors.on_surface_variant} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <Text style={styles.emptyMealText}>{t('nutrition.empty_meal')}</Text>
                    <Text style={styles.emptyMealSub}>{t('nutrition.empty_meal_sub')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

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
              <Text style={styles.modalTitle}>{t('nutrition.swap_title')}</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => { setShowSwapModal(false); setActiveSwapMeal(null); }}
              >
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
                alternatives.map((alt) => (
                  <Pressable key={alt.id} style={styles.altCard} onPress={() => handleSelectSwap(alt.id)}>
                    <View style={{ position: 'relative' }}>
                      <Image source={{ uri: alt.thumbnail }} style={styles.altImage} resizeMode="cover" />
                      <View style={[styles.playBtn, { width: 28, height: 28, borderRadius: 14 }]}>
                        <Play size={12} color="#FFF" fill="#FFF" />
                      </View>
                    </View>
                    <View style={styles.altInfo}>
                      <Text style={styles.altTitle}>{alt.title}</Text>
                      <Text style={styles.altTime}>{alt.duration}</Text>
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
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: 22,
    minWidth: 44,
    overflow: 'hidden',
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

  // Phase Focus card
  focusCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
  },
  focusOverline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  focusTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  focusAdvice: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    color: '#FFFFFF',
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
  swapBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
});
