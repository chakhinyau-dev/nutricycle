import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

// Structured key foods data for all phases (pointing to translation keys)
const FOODS_BY_PHASE = {
  menstrual: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'lentejas', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150' },
        { key: 'salmon_salvaje', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_lino', image: 'https://images.unsplash.com/photo-1600857544200-e2b8c5e6361a?w=150' },
        { key: 'nueces', image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'avena_integral', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=150' },
        { key: 'quinoa', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'espinacas', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150' },
        { key: 'fresas_berries', image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=150' }
      ]
    }
  ],
  follicular: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pollo_pastoreo', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=150' },
        { key: 'garbanzos', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_calabaza', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'almendras', image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'arroz_integral', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'brocoli', image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=150' },
        { key: 'aguacate', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150' }
      ]
    }
  ],
  ovulation: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pescado_blanco', image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=150' },
        { key: 'huevos_organicos', image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_sesamo', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'aceite_oliva', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'quinoa_cocida', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'hojas_verdes', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150' },
        { key: 'frambuesas', image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=150' }
      ]
    }
  ],
  luteal: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pavo', image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=150' },
        { key: 'legumbres', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_girasol', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'mantequilla_almendras', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'camote', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'arroz_integral', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'calabaza', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=150' },
        { key: 'platano', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150' }
      ]
    }
  ]
};

export const KeyFoodsScreen = ({ onBack, currentPhaseKey = 'follicular' }) => {
  const { t } = useTranslation();
  const normalizedPhaseKey = currentPhaseKey === 'ovulation' ? 'ovulation' : (currentPhaseKey || 'follicular');
  const [selectedPhase, setSelectedPhase] = useState(normalizedPhaseKey);
  const [expandedFood, setExpandedFood] = useState(null);

  const phases = [
    { key: 'menstrual', label: t('phases.menstrual') },
    { key: 'follicular', label: t('phases.follicular') },
    { key: 'ovulation', label: t('phases.ovulation') },
    { key: 'luteal', label: t('phases.luteal') },
  ];

  const categories = FOODS_BY_PHASE[selectedPhase] || FOODS_BY_PHASE.follicular;

  const toggleExpand = (foodKey) => {
    if (expandedFood === foodKey) {
      setExpandedFood(null);
    } else {
      setExpandedFood(foodKey);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>{t('key_foods.title')}</Text>
        </View>

        {/* Phase Filter Selector */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>{t('key_foods.select_phase')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {phases.map((phase) => (
              <Pressable
                key={phase.key}
                style={[
                  styles.filterPill,
                  selectedPhase === phase.key && styles.filterPillActive,
                ]}
                onPress={() => {
                  setSelectedPhase(phase.key);
                  setExpandedFood(null);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedPhase === phase.key && styles.filterTextActive,
                  ]}
                >
                  {phase.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Categories and Foods List */}
        <View style={styles.listSection}>
          {categories.map((cat, catIdx) => (
            <View key={cat.categoryKey} style={[styles.categoryCard, catIdx > 0 && { marginTop: 24 }]}>
              <Text style={styles.categoryTitle}>{t(`key_foods.categories.${cat.categoryKey}`)}</Text>
              <View style={styles.categoryBorder} />
              
              {cat.items.map((food, foodIdx) => {
                const isExpanded = expandedFood === food.key;
                const localizedName = t(`key_foods.items.${food.key}.name`);
                return (
                  <View key={food.key} style={[styles.foodRowContainer, foodIdx > 0 && styles.foodRowDivider]}>
                    <Pressable style={styles.foodPressable} onPress={() => toggleExpand(food.key)}>
                      <Image source={{ uri: food.image }} style={styles.foodImage} />
                      <Text style={styles.foodName}>{localizedName}</Text>
                      <View style={styles.chevron}>
                        {isExpanded ? (
                          <ChevronUp size={18} color={colors.on_surface_variant} />
                        ) : (
                          <ChevronDown size={18} color={colors.on_surface_variant} />
                        )}
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <Text style={styles.benefitText}>{t(`key_foods.items.${food.key}.benefit`)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>
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
  filterSection: {
    marginBottom: 32,
  },
  filterTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  filterScroll: {
    gap: 12,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  filterPillActive: {
    backgroundColor: colors.primary, // Sage Green (#A3B3A5)
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: colors.on_surface_variant,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    width: '100%',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    marginBottom: 12,
  },
  categoryBorder: {
    height: 1,
    backgroundColor: '#F1F1E8',
    marginBottom: 8,
  },
  foodRowContainer: {
    width: '100%',
  },
  foodRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F1E8',
  },
  foodPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  foodImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF9F6',
    marginRight: 16,
  },
  foodName: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.on_surface,
  },
  chevron: {
    padding: 4,
  },
  expandedContent: {
    backgroundColor: '#FAF9F2', // cream sub-background
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  benefitText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    lineHeight: 22,
  },
});
