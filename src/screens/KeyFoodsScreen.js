import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Leaf, Plus, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FOODS_BY_PHASE } from '../utils/foodsData';

const CATEGORY_COLORS = {
  proteins: '#E8845A',
  fats: '#D4A853',
  carbs: '#8B9DC3',
  veg_fruits: '#6EA87B',
};

const HORMONE_TAG_COLORS = {
  estrogen:         { bg: '#EEF0FA', text: '#7B8DC8', dot: '#7B8DC8' },
  progesterone:     { bg: '#EBF5ED', text: '#5A9E6A', dot: '#6EA87B' },
  antiinflammatory: { bg: '#FEF0EA', text: '#C96B44', dot: '#E8845A' },
  energy:           { bg: '#FDF5E4', text: '#B8882A', dot: '#D4A853' },
};

export const KeyFoodsScreen = ({ onBack, currentPhaseKey = 'follicular', user }) => {
  const { t } = useTranslation();
  const userId = user?.id || 'guest';
  const normalizedPhaseKey = currentPhaseKey || 'follicular';
  const [selectedPhase, setSelectedPhase] = useState(normalizedPhaseKey);
  const [addedItems, setAddedItems] = useState({});

  const phases = [
    { key: 'menstrual',  label: t('phases.menstrual') },
    { key: 'follicular', label: t('phases.follicular') },
    { key: 'ovulation',  label: t('phases.ovulation') },
    { key: 'luteal',     label: t('phases.luteal') },
  ];

  const categories = FOODS_BY_PHASE[selectedPhase] || FOODS_BY_PHASE.follicular;

  const handleAddToList = async (foodKey, foodName) => {
    const storageKey = `@nutricycle_custom_items_${userId}`;
    try {
      const existing = await AsyncStorage.getItem(storageKey);
      const items = existing ? JSON.parse(existing) : [];
      if (!items.some(i => i.name === foodName)) {
        const updated = [...items, { id: `kf_${foodKey}_${Date.now()}`, name: foodName }];
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      }
      setAddedItems(prev => ({ ...prev, [foodKey]: true }));
      setTimeout(() => setAddedItems(prev => ({ ...prev, [foodKey]: false })), 2000);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{t('dashboard.key_foods_title', { defaultValue: 'KEY FOODS' })}</Text>
            <Text style={styles.title}>{t('key_foods.title')}</Text>
          </View>
        </View>

        {/* Phase context description */}
        <Text style={styles.phaseDesc}>{t(`key_foods.phase_desc.${selectedPhase}`)}</Text>

        {/* Phase filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterRow}
        >
          {phases.map(phase => (
            <Pressable
              key={phase.key}
              style={[styles.filterPill, selectedPhase === phase.key && styles.filterPillActive]}
              onPress={() => setSelectedPhase(phase.key)}
            >
              <Text style={[styles.filterText, selectedPhase === phase.key && styles.filterTextActive]}>
                {phase.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Food categories */}
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Leaf size={36} color={colors.primary} style={{ opacity: 0.4, marginBottom: 14 }} />
            <Text style={styles.emptyStateText}>{t('key_foods.no_foods')}</Text>
          </View>
        ) : (
          categories.map(cat => {
            const catColor = CATEGORY_COLORS[cat.categoryKey] || colors.primary;
            return (
              <View key={cat.categoryKey} style={styles.categorySection}>
                {/* Category header */}
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.categoryTitle, { color: catColor }]}>
                    {t(`key_foods.categories.${cat.categoryKey}`).toUpperCase()}
                  </Text>
                </View>

                {/* Ingredient cards */}
                {cat.items.map(food => {
                  const tagColors = HORMONE_TAG_COLORS[food.hormoneTag] || HORMONE_TAG_COLORS.energy;
                  const isAdded = !!addedItems[food.key];
                  const foodName = t(`key_foods.items.${food.key}.name`);
                  return (
                    <View key={food.key} style={styles.foodCard}>
                      {/* Top row: image + name + add button */}
                      <View style={styles.foodCardTop}>
                        <Image source={{ uri: food.image }} style={styles.foodImage} />
                        <View style={styles.foodCardCenter}>
                          <Text style={styles.foodName}>{foodName}</Text>
                          {/* Hormone tag badge */}
                          <View style={[styles.hormoneTag, { backgroundColor: tagColors.bg }]}>
                            <View style={[styles.hormoneDot, { backgroundColor: tagColors.dot }]} />
                            <Text style={[styles.hormoneTagText, { color: tagColors.text }]}>
                              {t(`key_foods.hormone_tags.${food.hormoneTag}`)}
                            </Text>
                          </View>
                        </View>
                        {/* Add to shopping list button */}
                        <Pressable
                          style={[styles.addBtn, isAdded && styles.addBtnDone]}
                          onPress={() => handleAddToList(food.key, foodName)}
                        >
                          {isAdded
                            ? <Check size={16} color={colors.primary} />
                            : <Plus size={16} color={colors.on_surface_variant} />
                          }
                        </Pressable>
                      </View>

                      {/* Hormonal benefit note — always visible */}
                      <View style={[styles.benefitBox, { borderLeftColor: catColor }]}>
                        <Text style={styles.benefitText}>
                          {t(`key_foods.items.${food.key}.benefit`)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={{ height: 160 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F2',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    lineHeight: 32,
  },
  phaseDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
    lineHeight: 18,
    marginBottom: 20,
  },
  filterRow: {
    marginBottom: 28,
  },
  filterScroll: {
    gap: 10,
    paddingRight: 8,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface_variant,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  categorySection: {
    marginBottom: 28,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  foodCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  foodImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#FAF9F6',
  },
  foodCardCenter: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  foodName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.on_surface,
    lineHeight: 20,
  },
  hormoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  hormoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hormoneTagText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginTop: 2,
  },
  addBtnDone: {
    backgroundColor: '#EBF5ED',
    borderColor: '#A3C9A8',
  },
  benefitBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  benefitText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.on_surface_variant,
    lineHeight: 19,
    opacity: 0.85,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface_variant,
    opacity: 0.6,
    textAlign: 'center',
  },
});
