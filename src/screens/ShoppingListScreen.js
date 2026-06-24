import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, Trash2, CheckCircle2, Circle, Play } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FOODS_BY_PHASE } from '../utils/foodsData';

const { width } = Dimensions.get('window');

const CATEGORY_COLORS = {
  proteins: '#E8845A',
  fats: '#D4A853',
  carbs: '#8B9DC3',
  veg_fruits: '#6EA87B',
};

export const ShoppingListScreen = ({ onBack, currentPhaseKey = 'follicular', user, videos = [], onNavigate }) => {
  const { t } = useTranslation();
  const userId = user?.id || 'guest';
  const phaseKey = currentPhaseKey || 'follicular';
  const phaseFoods = FOODS_BY_PHASE[phaseKey] || FOODS_BY_PHASE.follicular;

  // Videos for the current phase
  const phaseVideos = videos.filter(v => v.phaseKey === phaseKey).slice(0, 4);

  const [checkedItems, setCheckedItems] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [newCustomItem, setNewCustomItem] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const savedChecks = await AsyncStorage.getItem(`@nutricycle_checked_v2_${userId}_${phaseKey}`);
        if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
        const savedCustoms = await AsyncStorage.getItem(`@nutricycle_custom_items_${userId}`);
        if (savedCustoms) setCustomItems(JSON.parse(savedCustoms));
      } catch (e) {}
    };
    load();
  }, [userId, phaseKey]);

  const toggleCheck = async (key) => {
    const updated = { ...checkedItems, [key]: !checkedItems[key] };
    setCheckedItems(updated);
    try {
      await AsyncStorage.setItem(`@nutricycle_checked_v2_${userId}_${phaseKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddCustomItem = async () => {
    if (!newCustomItem.trim()) return;
    const item = { id: Date.now().toString(), name: newCustomItem.trim() };
    const updated = [...customItems, item];
    setCustomItems(updated);
    setNewCustomItem('');
    try {
      await AsyncStorage.setItem(`@nutricycle_custom_items_${userId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const removeCustomItem = async (id) => {
    const updated = customItems.filter(i => i.id !== id);
    setCustomItems(updated);
    try {
      await AsyncStorage.setItem(`@nutricycle_custom_items_${userId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearList = () => {
    Alert.alert(
      t('shopping.clear_confirm_title'),
      t('shopping.clear_confirm_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setCheckedItems({});
            setCustomItems([]);
            try {
              await AsyncStorage.removeItem(`@nutricycle_checked_v2_${userId}_${phaseKey}`);
              await AsyncStorage.removeItem(`@nutricycle_custom_items_${userId}`);
            } catch (e) {}
          }
        }
      ]
    );
  };

  const totalItems = phaseFoods.reduce((sum, cat) => sum + cat.items.length, 0) + customItems.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = totalItems > 0 ? checkedCount / totalItems : 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{t('shopping.overline', { defaultValue: 'SMART SHOPPING' })}</Text>
            <Text style={styles.title}>{t('shopping.title')}</Text>
          </View>
          <Pressable onPress={handleClearList} style={styles.clearBtn}>
            <Trash2 size={18} color="#EB5757" />
          </Pressable>
        </View>

        {/* Phase badge */}
        <View style={styles.phaseBadge}>
          <Text style={styles.phaseBadgeText}>{t(`phases.${phaseKey}`).toUpperCase()}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {t('shopping.progress', { checked: checkedCount, total: totalItems, defaultValue: `${checkedCount} of ${totalItems} items` })}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Phase videos */}
        {phaseVideos.length > 0 && (
          <View style={styles.videosSection}>
            <Text style={styles.videosSectionTitle}>{t('shopping.videos_for_phase', { defaultValue: 'Videos for this phase' })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videosRow}>
              {phaseVideos.map(video => (
                <Pressable
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => onNavigate && onNavigate('videos')}
                >
                  <View style={styles.videoThumbWrap}>
                    {video.thumbnailUrl ? (
                      <Image source={{ uri: video.thumbnailUrl }} style={styles.videoThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.videoThumb, { backgroundColor: '#E8E4DC' }]} />
                    )}
                    <View style={styles.playBadge}>
                      <Play size={10} color="#FFF" fill="#FFF" />
                    </View>
                    {video.duration ? (
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{video.duration}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                  <Text style={styles.videoMeal}>{t(`dailylog.meal_types.${video.mealType}`, { defaultValue: video.mealType })}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Phase food categories */}
        {phaseFoods.map(cat => {
          const catColor = CATEGORY_COLORS[cat.categoryKey] || colors.primary;
          return (
            <View key={cat.categoryKey} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                <Text style={styles.categoryTitle}>{t(`key_foods.categories.${cat.categoryKey}`)}</Text>
              </View>

              {cat.items.map(item => {
                const isChecked = !!checkedItems[item.key];
                const isExpanded = expandedItem === item.key;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.foodCard, isChecked && styles.foodCardChecked]}
                    onPress={() => toggleCheck(item.key)}
                    onLongPress={() => setExpandedItem(isExpanded ? null : item.key)}
                  >
                    <View style={styles.checkCol}>
                      {isChecked
                        ? <CheckCircle2 size={22} color={colors.primary} />
                        : <Circle size={22} color="#CBD5E1" />
                      }
                    </View>
                    <View style={styles.foodContent}>
                      <Text style={[styles.foodName, isChecked && styles.foodNameChecked]}>
                        {t(`key_foods.items.${item.key}.name`)}
                      </Text>
                      <Text
                        style={[styles.foodBenefit, isChecked && styles.foodBenefitChecked]}
                        numberOfLines={isExpanded ? 0 : 2}
                      >
                        {t(`key_foods.items.${item.key}.benefit`)}
                      </Text>
                    </View>
                    <View style={[styles.catPill, { backgroundColor: `${catColor}20` }]}>
                      <View style={[styles.catPillDot, { backgroundColor: catColor }]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {/* Custom items */}
        {customItems.length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.categoryTitle}>{t('shopping.categories.other')}</Text>
            </View>
            {customItems.map(item => (
              <View key={item.id} style={styles.foodCard}>
                <Pressable onPress={() => toggleCheck(`custom_${item.id}`)} style={styles.checkCol}>
                  {checkedItems[`custom_${item.id}`]
                    ? <CheckCircle2 size={22} color={colors.primary} />
                    : <Circle size={22} color="#CBD5E1" />
                  }
                </Pressable>
                <Text style={[styles.foodName, { flex: 1 }, checkedItems[`custom_${item.id}`] && styles.foodNameChecked]}>
                  {item.name}
                </Text>
                <Pressable onPress={() => removeCustomItem(item.id)} style={{ padding: 8 }}>
                  <Trash2 size={16} color="#EB5757" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add custom item */}
        <View style={styles.addCustomCard}>
          <Text style={styles.addCustomTitle}>{t('shopping.add_custom')}</Text>
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder={t('shopping.add_placeholder')}
              placeholderTextColor={colors.placeholder}
              value={newCustomItem}
              onChangeText={setNewCustomItem}
              onSubmitEditing={handleAddCustomItem}
              returnKeyType="done"
            />
            <Pressable style={styles.addBtn} onPress={handleAddCustomItem}>
              <Plus size={22} color="#FFF" />
            </Pressable>
          </View>
        </View>

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
    gap: 12,
    marginBottom: 20,
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
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary_container,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  phaseBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.secondary,
    letterSpacing: 1.2,
  },
  progressSection: {
    marginBottom: 28,
  },
  progressLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface_variant,
    marginBottom: 8,
    opacity: 0.7,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E5DC',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    gap: 12,
  },
  foodCardChecked: {
    opacity: 0.55,
    backgroundColor: '#F8F8F4',
  },
  checkCol: {
    paddingTop: 1,
  },
  foodContent: {
    flex: 1,
  },
  foodName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface,
    marginBottom: 4,
  },
  foodNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.on_surface_variant,
  },
  foodBenefit: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.on_surface_variant,
    lineHeight: 17,
    opacity: 0.75,
  },
  foodBenefitChecked: {
    opacity: 0.4,
  },
  catPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  catPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addCustomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginTop: 8,
  },
  addCustomTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#F9F9F2',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videosSection: {
    marginBottom: 28,
  },
  videosSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  videosRow: {
    gap: 12,
    paddingRight: 4,
  },
  videoCard: {
    width: (width - 72) / 2,
  },
  videoThumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  videoThumb: {
    width: '100%',
    height: 90,
    borderRadius: 12,
  },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: '#FFF',
  },
  videoTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface,
    lineHeight: 17,
    marginBottom: 2,
  },
  videoMeal: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
    textTransform: 'capitalize',
  },
});
