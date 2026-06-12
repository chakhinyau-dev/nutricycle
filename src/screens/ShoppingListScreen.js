import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, Trash2, CheckSquare, Square, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getRecipesForDayAndPhase } from '../utils/recipeHelper';

const { width } = Dimensions.get('window');

const DAYS_OF_WEEK = [
  { id: 0, key: 'mon', label: 'Lunes' },
  { id: 1, key: 'tue', label: 'Martes' },
  { id: 2, key: 'wed', label: 'Miércoles' },
  { id: 3, key: 'thu', label: 'Jueves' },
  { id: 4, key: 'fri', label: 'Viernes' },
  { id: 5, key: 'sat', label: 'Sábado' },
  { id: 6, key: 'sun', label: 'Domingo' }
];

export const ShoppingListScreen = ({ onBack, recipes, currentPhaseKey = 'follicular', user }) => {
  const { t } = useTranslation();
  const userId = user?.id || 'guest';
  const phaseKey = currentPhaseKey || 'follicular';

  const [selectedDays, setSelectedDays] = useState([true, true, true, false, false, false, false]); // Mon, Tue, Wed default true
  const [swaps, setSwaps] = useState({});
  const [consolidatedList, setConsolidatedList] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [newCustomItem, setNewCustomItem] = useState('');

  // Load selected days, swaps and custom items from AsyncStorage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedDays = await AsyncStorage.getItem(`@nutricycle_shopping_days_${userId}`);
        if (savedDays) setSelectedDays(JSON.parse(savedDays));

        const savedSwaps = await AsyncStorage.getItem(`@nutricycle_swaps_${userId}`);
        if (savedSwaps) setSwaps(JSON.parse(savedSwaps));

        const savedCustoms = await AsyncStorage.getItem(`@nutricycle_custom_items_${userId}`);
        if (savedCustoms) setCustomItems(JSON.parse(savedCustoms));

        const savedChecks = await AsyncStorage.getItem(`@nutricycle_checked_items_${userId}`);
        if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
      } catch (e) {
        console.error('Failed to load shopping list data', e);
      }
    };
    loadSavedData();
  }, [userId]);

  // Consolidate list based on selected days and swaps
  useEffect(() => {
    generateConsolidatedList();
  }, [selectedDays, swaps, recipes, phaseKey]);

  const saveSelectedDays = async (newDays) => {
    setSelectedDays(newDays);
    try {
      await AsyncStorage.setItem(`@nutricycle_shopping_days_${userId}`, JSON.stringify(newDays));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDay = (index) => {
    const newDays = [...selectedDays];
    newDays[index] = !newDays[index];
    saveSelectedDays(newDays);
  };

  const generateConsolidatedList = () => {
    const list = {};

    selectedDays.forEach((isChecked, dayIdx) => {
      if (!isChecked) return;

      const dailyMeals = getRecipesForDayAndPhase(recipes, phaseKey, dayIdx, swaps);
      dailyMeals.forEach(meal => {
        const recipe = meal.recipe;
        if (!recipe || !recipe.structuredIngredients) return;

        recipe.structuredIngredients.forEach(ing => {
          const key = `${ing.name.toLowerCase().trim()}_${ing.unit.toLowerCase().trim()}`;
          
          if (list[key]) {
            list[key].quantity += ing.quantity;
          } else {
            list[key] = {
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category || 'Pantry'
            };
          }
        });
      });
    });

    // Convert to array and group by category
    const itemsArray = Object.values(list);
    setConsolidatedList(itemsArray);
  };

  const toggleCheckItem = async (itemName) => {
    const newChecks = { ...checkedItems };
    newChecks[itemName] = !newChecks[itemName];
    setCheckedItems(newChecks);
    try {
      await AsyncStorage.setItem(`@nutricycle_checked_items_${userId}`, JSON.stringify(newChecks));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCustomItem = async () => {
    if (!newCustomItem.trim()) return;
    const item = {
      id: Date.now().toString(),
      name: newCustomItem.trim(),
      category: 'Otros'
    };
    const updated = [...customItems, item];
    setCustomItems(updated);
    setNewCustomItem('');
    try {
      await AsyncStorage.setItem(`@nutricycle_custom_items_${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearList = () => {
    Alert.alert(
      t('shopping.clear_confirm_title'),
      t('shopping.clear_confirm_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Limpiar' }),
          style: 'destructive',
          onPress: async () => {
            setCheckedItems({});
            setCustomItems([]);
            saveSelectedDays([false, false, false, false, false, false, false]);
            try {
              await AsyncStorage.removeItem(`@nutricycle_checked_items_${userId}`);
              await AsyncStorage.removeItem(`@nutricycle_custom_items_${userId}`);
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  // Group consolidated ingredients by category
  const categories = ['Proteins', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 'Pantry', 'Otros'];
  const categoryLabels = {
    Proteins: t('shopping.categories.proteins'),
    Vegetables: t('shopping.categories.vegetables'),
    Fruits: t('shopping.categories.fruits'),
    Dairy: t('shopping.categories.dairy'),
    Grains: t('shopping.categories.grains'),
    Pantry: t('shopping.categories.pantry'),
    Otros: t('shopping.categories.other')
  };

  const getCategorizedItems = (cat) => {
    if (cat === 'Otros') return customItems;
    return consolidatedList.filter(item => {
      const itemCat = item.category || 'Pantry';
      return itemCat.toLowerCase() === cat.toLowerCase();
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>{t('shopping.title')}</Text>
        </View>

        {/* Day selection segment */}
        <View style={styles.daysCard}>
          <Text style={styles.sectionTitle}>{t('shopping.days_cook')}</Text>
          <Text style={styles.sectionSubtitle}>{t('shopping.select_days_desc')}</Text>
          
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map(day => {
              const isSelected = selectedDays[day.id];
              return (
                <Pressable
                  key={day.id}
                  style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextActive]}>
                    {t(`shopping.days.${day.key}.full`).substring(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Action Bar */}
        {(consolidatedList.length > 0 || customItems.length > 0) && (
          <View style={styles.actionBar}>
            <Pressable style={styles.actionClearBtn} onPress={handleClearList}>
              <Trash2 size={18} color="#EB5757" />
              <Text style={styles.actionClearText}>{t('shopping.clear_all')}</Text>
            </Pressable>
            
            <Pressable style={styles.actionRegenBtn} onPress={generateConsolidatedList}>
              <RefreshCw size={16} color={colors.primary} />
              <Text style={styles.actionRegenText}>{t('shopping.regenerate')}</Text>
            </Pressable>
          </View>
        )}

        {/* List ingredients grouped by category */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>{t('shopping.consolidated_list')}</Text>
          
          {consolidatedList.length === 0 && customItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('shopping.empty_placeholder')}</Text>
            </View>
          ) : (
            categories.map(cat => {
              const items = getCategorizedItems(cat);
              if (items.length === 0) return null;

              return (
                <View key={cat} style={styles.categoryGroup}>
                  <Text style={styles.categoryHeader}>{categoryLabels[cat]}</Text>
                  <View style={styles.categoryCard}>
                    {items.map(item => {
                      const isChecked = !!checkedItems[item.name];
                      const qtyDisplay = item.quantity ? `${Number(item.quantity.toFixed(1))} ${item.unit}` : '';

                      return (
                        <Pressable
                          key={item.name || item.id}
                          style={styles.itemRow}
                          onPress={() => toggleCheckItem(item.name)}
                        >
                          <View style={styles.checkIcon}>
                            {isChecked ? (
                              <CheckSquare size={22} color={colors.primary} />
                            ) : (
                              <Square size={22} color="#CBD5E1" />
                            )}
                          </View>
                          <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                            {item.name}
                          </Text>
                          {qtyDisplay ? (
                            <Text style={[styles.itemQty, isChecked && styles.itemNameChecked]}>
                              {qtyDisplay}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Add Custom Item */}
        <View style={styles.addCustomCard}>
          <Text style={styles.addCustomTitle}>{t('shopping.add_custom')}</Text>
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder={t('shopping.add_placeholder')}
              placeholderTextColor={colors.placeholder}
              value={newCustomItem}
              onChangeText={setNewCustomItem}
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
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    marginBottom: 16,
    opacity: 0.8,
  },
  daysCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginBottom: 24,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  dayButton: {
    width: (width - 120) / 4,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  dayButtonActive: {
    backgroundColor: colors.secondary, // Mist Purple (#968DA1)
    borderColor: colors.secondary,
  },
  dayButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionClearText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#EB5757',
  },
  actionRegenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  actionRegenText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  listSection: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    borderStyle: 'dashed',
    marginTop: 12,
  },
  emptyText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  categoryGroup: {
    marginTop: 24,
  },
  categoryHeader: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
    marginLeft: 4,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1E8',
  },
  checkIcon: {
    marginRight: 14,
  },
  itemName: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.on_surface_variant,
    opacity: 0.5,
  },
  itemQty: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.secondary,
  },
  addCustomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  addCustomTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface,
    marginBottom: 14,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    paddingHorizontal: 16,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    backgroundColor: '#FAF9F6',
    color: colors.on_surface,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
