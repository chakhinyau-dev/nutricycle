import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Image, Animated } from 'react-native';
import { Search, TrendingDown, Layout, Bookmark, LayoutGrid, Coffee, Utensils, Apple, Moon, ChevronLeft, Crown } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { MOCK_RECIPES, PHASES_DATA } from '../utils/mockData';
import { translateContent } from '../services/translationService';

const PHASE_TAB_COLORS = {
  menstrual:  { solid: '#E8A0A2', tint: 'rgba(232,160,162,0.18)', border: 'rgba(232,160,162,0.6)' },
  follicular: { solid: '#A3B3A5', tint: 'rgba(163,179,165,0.18)', border: 'rgba(163,179,165,0.6)' },
  ovulation:  { solid: '#C9A84C', tint: 'rgba(201,168,76,0.18)',  border: 'rgba(201,168,76,0.6)'  },
  luteal:     { solid: '#968DA1', tint: 'rgba(150,141,161,0.18)', border: 'rgba(150,141,161,0.6)' },
};

const PHASE_COUNT = 5;
const MEAL_COUNT  = 6;
const MAX_CARDS   = 12;

const getCategories = (t) => [
  { id: 'all',        name: t('common.all') },
  { id: 'menstrual',  name: t('phases.menstrual') },
  { id: 'follicular', name: t('phases.follicular') },
  { id: 'ovulation',  name: t('phases.ovulation') },
  { id: 'luteal',     name: t('phases.luteal') },
];

const getMealTypes = (t) => [
  { id: 'all',       name: t('common.all') },
  { id: 'prep',      name: t('dailylog.meal_types.prep') },
  { id: 'breakfast', name: t('dailylog.meal_types.breakfast') },
  { id: 'lunch',     name: t('dailylog.meal_types.lunch') },
  { id: 'snack',     name: t('dailylog.meal_types.snack') },
  { id: 'dinner',    name: t('dailylog.meal_types.dinner') },
];

export const RecipesScreen = ({
  onBack,
  onNavigate,
  user,
  recipes = MOCK_RECIPES,
  currentPhaseKey = 'follicular',
  isLocked = false,
  onSubscribe,
  cycleProfile,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState(currentPhaseKey || 'all');
  const [activeMealType, setActiveMealType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayRecipes, setDisplayRecipes] = useState(recipes);
  const [filterVersion, setFilterVersion] = useState(0);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  // ── Animation values ───────────────────────────────────────────────
  const headerAnim = useRef({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(-18),
  }).current;


  const phaseLabel = useRef(new Animated.Value(0)).current;
  const phasePillAnims = useRef(
    Array.from({ length: PHASE_COUNT }, () => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.72),
    }))
  ).current;
  const phaseSelectScales = useRef(
    Array.from({ length: PHASE_COUNT }, () => new Animated.Value(1))
  ).current;

  const mealLabel = useRef(new Animated.Value(0)).current;
  const mealPillAnims = useRef(
    Array.from({ length: MEAL_COUNT }, () => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.72),
    }))
  ).current;
  const mealPressScales = useRef(
    Array.from({ length: MEAL_COUNT }, () => new Animated.Value(1))
  ).current;

  const cardAnims = useRef(
    Array.from({ length: MAX_CARDS }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(24),
    }))
  ).current;
  // ──────────────────────────────────────────────────────────────────

  const categories = useMemo(() => getCategories(t), [t]);
  const mealTypes  = useMemo(() => getMealTypes(t), [t]);

  // Translation effect
  React.useEffect(() => {
    const runId = ++translationRunId.current;
    setDisplayRecipes(recipes);
    const translateAll = async () => {
      const translated = [];
      const chunkSize = 3;
      for (let i = 0; i < recipes.length; i += chunkSize) {
        const chunk = recipes.slice(i, i + chunkSize);
        const translatedChunk = await Promise.all(chunk.map((r) => translateContent(r, currentLanguage)));
        translated.push(...translatedChunk);
        if (translationRunId.current === runId) {
          setDisplayRecipes([...translated, ...recipes.slice(translated.length)]);
        }
      }
    };
    translateAll();
    return () => { translationRunId.current += 1; };
  }, [currentLanguage, recipes]);

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = displayRecipes.filter((recipe) => {
      const vidPhase = recipe.phaseKey || recipe.phase_key || '';
      const vidMeal  = recipe.mealType  || recipe.meal_type  || '';
      const matchesSearch    = !query || recipe.title.toLowerCase().includes(query);
      const isPrep           = vidMeal === 'prep';
      const matchesCategory  = activeTab === 'all' || isPrep || vidPhase === activeTab;
      const matchesMealType  = activeMealType === 'all' || vidMeal === activeMealType;
      return matchesSearch && matchesCategory && matchesMealType;
    });
    const userGoal = cycleProfile?.goal || 'balance';
    return [...matches].sort((a, b) => {
      const aGoal = a.goals?.includes(userGoal) ? 1 : 0;
      const bGoal = b.goals?.includes(userGoal) ? 1 : 0;
      return bGoal - aGoal;
    });
  }, [activeTab, activeMealType, displayRecipes, searchQuery, cycleProfile]);

  // Mount entrance
  useEffect(() => {
    // Header slides down from above
    Animated.timing(headerAnim.opacity,    { toValue: 1, duration: 280, useNativeDriver: true }).start();
    Animated.spring(headerAnim.translateY, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }).start();


    // Phase filter label fades in
    Animated.timing(phaseLabel, { toValue: 1, duration: 200, delay: 200, useNativeDriver: true }).start();

    // Phase pills stagger pop-in (scale 0.72→1 + fade)
    Animated.sequence([
      Animated.delay(240),
      Animated.stagger(50, phasePillAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(a.scale,   { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
        ])
      )),
    ]).start();

    // Meal type label
    Animated.timing(mealLabel, { toValue: 1, duration: 200, delay: 420, useNativeDriver: true }).start();

    // Meal pills stagger pop-in
    Animated.sequence([
      Animated.delay(440),
      Animated.stagger(45, mealPillAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(a.scale,   { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
        ])
      )),
    ]).start();

    // Recipe cards stagger slide-up
    Animated.sequence([
      Animated.delay(600),
      Animated.stagger(55, cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, []);

  // Re-stagger recipe cards on filter change
  useEffect(() => {
    if (filterVersion === 0) return;
    Animated.sequence([
      Animated.delay(60),
      Animated.stagger(55, cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, [filterVersion]);

  // Phase pill tap: reset cards → update state → bounce tapped pill
  const handlePhaseSelect = (categoryId, index) => {
    cardAnims.forEach(a => { a.opacity.setValue(0); a.translateY.setValue(24); });
    setActiveTab(categoryId);
    setFilterVersion(v => v + 1);
    Animated.sequence([
      Animated.spring(phaseSelectScales[index], { toValue: 1.14, friction: 5, tension: 160, useNativeDriver: true }),
      Animated.spring(phaseSelectScales[index], { toValue: 1,    friction: 7, tension: 90,  useNativeDriver: true }),
    ]).start();
  };

  // Meal pill tap: reset cards → update state
  const handleMealSelect = (typeId, index) => {
    cardAnims.forEach(a => { a.opacity.setValue(0); a.translateY.setValue(24); });
    setActiveMealType(typeId);
    setFilterVersion(v => v + 1);
  };

  const handleMealPressIn  = (index) => {
    Animated.spring(mealPressScales[index], { toValue: 0.88, friction: 8, tension: 200, useNativeDriver: true }).start();
  };
  const handleMealPressOut = (index) => {
    Animated.spring(mealPressScales[index], { toValue: 1,    friction: 6, tension: 100, useNativeDriver: true }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={!isLocked}
      >
        {/* Header slides down */}
        <Animated.View style={[styles.header, { opacity: headerAnim.opacity, transform: [{ translateY: headerAnim.translateY }] }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onBack} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.on_surface} />
            </Pressable>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>{t('recipes.title')}</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Search bar — always visible, TextInput conflicts with Animated.View opacity */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.on_surface_variant} opacity={0.5} />
            <TextInput
              placeholder={t('recipes.search_placeholder')}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Phase filter pills */}
        <View style={{ marginBottom: 24 }}>
          <Animated.Text style={[styles.filterTitle, { opacity: phaseLabel }]}>
            {t('recipes.filter_phase')}
          </Animated.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {categories.map((category, index) => {
              const pc = PHASE_TAB_COLORS[category.id];
              const isActive = activeTab === category.id;
              const pa = phasePillAnims[index];
              return (
                <Animated.View
                  key={category.id}
                  style={{
                    opacity:   pa.opacity,
                    transform: [{ scale: Animated.multiply(pa.scale, phaseSelectScales[index]) }],
                  }}
                >
                  <Pressable
                    style={[
                      styles.filterPill,
                      pc && !isActive && { backgroundColor: pc.tint, borderColor: pc.border },
                      pc && isActive  && { backgroundColor: pc.solid, borderColor: pc.solid },
                      !pc && isActive && styles.filterPillActive,
                    ]}
                    onPress={() => handlePhaseSelect(category.id, index)}
                  >
                    <Text style={[
                      styles.filterText,
                      pc && !isActive && { color: pc.solid },
                      isActive && styles.filterTextActive,
                    ]}>
                      {category.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal type filter pills */}
        <View style={{ marginBottom: 32 }}>
          <Animated.Text style={[styles.filterTitle, { opacity: mealLabel }]}>
            {t('recipes.filter_meal')}
          </Animated.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {mealTypes.map((type, index) => (
              <Animated.View
                key={type.id}
                style={{
                  opacity:   mealPillAnims[index].opacity,
                  transform: [{ scale: Animated.multiply(mealPillAnims[index].scale, mealPressScales[index]) }],
                }}
              >
                <Pressable
                  style={[styles.mealPill, activeMealType === type.id && styles.mealPillActive]}
                  onPress={() => handleMealSelect(type.id, index)}
                  onPressIn={() => handleMealPressIn(index)}
                  onPressOut={() => handleMealPressOut(index)}
                >
                  <Text style={[styles.mealText, activeMealType === type.id && styles.mealTextActive]}>
                    {type.name}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Recipe cards — stagger in, re-stagger on filter change */}
        <View style={styles.recipesList}>
          {filteredRecipes.length ? (
            filteredRecipes.map((recipe, i) => {
              const ca = i < MAX_CARDS ? cardAnims[i] : null;
              return (
                <Animated.View
                  key={recipe.id}
                  style={ca ? { opacity: ca.opacity, transform: [{ translateY: ca.translateY }] } : undefined}
                >
                  <RecipeCard
                    {...recipe}
                    onPress={() => onNavigate('recipeDetail', recipe)}
                  />
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('recipes.empty_state')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {isLocked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockCard}>
            <View style={styles.lockIconCircle}>
              <Crown size={32} color="#FFF" fill="#FFD700" />
            </View>
            <Text style={styles.lockTitle}>{t('subscription.unlock_premium_recipes')}</Text>
            <Text style={styles.lockSubtitle}>
              {t('subscription.unlock_recipes_desc')}
            </Text>
            <Pressable style={styles.subscribeBtn} onPress={onSubscribe}>
              <Text style={styles.subscribeBtnText}>{(t('subscription.subscribe_now')).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { paddingHorizontal: 28, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F1F1E8' },
  headerTextGroup: { justifyContent: 'center' },
  title: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: colors.on_surface },
  headerAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F1E8' },
  searchSection: { marginBottom: 32 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: '#F1F1E8' },
  searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Outfit_500Medium', fontSize: 16, color: colors.on_surface },
  filterScroll: { gap: 12 },
  filterTitle: { fontFamily: 'Outfit_700Bold', fontSize: 11, color: colors.on_surface_variant, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6 },
  filterPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F1E8' },
  filterPillActive: { backgroundColor: '#A3B3A5', borderColor: '#A3B3A5' },
  filterText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: colors.on_surface_variant },
  filterTextActive: { color: '#FFF' },
  mealPill: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#F1F1E8' },
  mealPillActive: { backgroundColor: '#A3B3A5', borderColor: '#A3B3A5' },
  mealText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface_variant },
  mealTextActive: { color: '#FFF' },
  recipesList: { width: '100%' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: 'Outfit_500Medium', fontSize: 16, color: colors.on_surface_variant, opacity: 0.5 },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 242, 255, 0.85)',
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  lockIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
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
