import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Image } from 'react-native';
import { Search, TrendingDown, Layout, Bookmark, LayoutGrid, Coffee, Utensils, Apple, Moon, ChevronLeft, Crown } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { MOCK_RECIPES, PHASES_DATA } from '../utils/mockData';
import { translateContent } from '../services/translationService';

const getCategories = (t) => [
  { id: 'all', name: t('common.all') },
  { id: 'menstrual', name: t('phases.menstrual') },
  { id: 'follicular', name: t('phases.follicular') },
  { id: 'ovulation', name: t('phases.ovulation') },
  { id: 'luteal', name: t('phases.luteal') },
];

const getMealTypes = (t) => [
  { id: 'all', name: t('common.all') },
  { id: 'breakfast', name: t('dailylog.meal_types.breakfast') },
  { id: 'lunch', name: t('dailylog.meal_types.lunch') },
  { id: 'snack', name: t('dailylog.meal_types.snack') },
  { id: 'dinner', name: t('dailylog.meal_types.dinner') },
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
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  const categories = useMemo(() => getCategories(t), [t]);
  const mealTypes = useMemo(() => getMealTypes(t), [t]);

  // Translation effect (remains same)
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
    return () => {
      translationRunId.current += 1;
    };
  }, [currentLanguage, recipes]);

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = displayRecipes.filter((recipe) => {
      const vidPhase = recipe.phaseKey || recipe.phase_key || '';
      const vidMeal = recipe.mealType || recipe.meal_type || '';
      const matchesSearch = !query || recipe.title.toLowerCase().includes(query);
      const matchesCategory = activeTab === 'all' || vidPhase === activeTab;
      const matchesMealType = activeMealType === 'all' || vidMeal === activeMealType;
      return matchesSearch && matchesCategory && matchesMealType;
    });

    const userGoal = cycleProfile?.goal || 'balance';
    return [...matches].sort((a, b) => {
      const aGoal = a.goals?.includes(userGoal) ? 1 : 0;
      const bGoal = b.goals?.includes(userGoal) ? 1 : 0;
      return bGoal - aGoal; // Priority to recipes matching user's main goal
    });
  }, [activeTab, activeMealType, displayRecipes, searchQuery, cycleProfile]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={!isLocked}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>{t('recipes.title')}</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

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

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.filterTitle}>{t('recipes.filter_phase')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.filterPill, activeTab === category.id && styles.filterPillActive]}
              onPress={() => setActiveTab(category.id)}
            >
              <Text style={[styles.filterText, activeTab === category.id && styles.filterTextActive]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.filterTitle}>{t('recipes.filter_meal')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {mealTypes.map((type) => (
            <Pressable
              key={type.id}
              style={[styles.mealPill, activeMealType === type.id && styles.mealPillActive]}
              onPress={() => setActiveMealType(type.id)}
            >
              <Text style={[styles.mealText, activeMealType === type.id && styles.mealTextActive]}>
                {type.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.recipesList}>
        {filteredRecipes.length ? (
          filteredRecipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              {...recipe} 
              onPress={() => onNavigate('recipeDetail', recipe)} 
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('recipes.empty_state')}</Text>
          </View>
        )}
      </View>

        <View style={{ height: 160 }} />
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
  mealPillActive: { backgroundColor: '#968DA1', borderColor: '#968DA1' },
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
