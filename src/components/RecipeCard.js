import React from 'react';
import { StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { Clock, Flame, ChevronRight } from 'lucide-react-native';
import { getRecipeImageSource } from '../services/recipeService';

export const RecipeCard = ({ title, calories, time, image, category, phaseKey, horizontal = false, grid = false, onPress }) => {
  const { t } = useTranslation();
  const imageSource = getRecipeImageSource(image);
  const displayCategory = phaseKey ? t(`phases.${phaseKey}`) : category;

  return (
    <Pressable 
      style={[styles.card, grid && styles.gridCard]}
      onPress={onPress}
    >
      <Image source={imageSource} style={grid ? styles.gridImage : styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{displayCategory?.toUpperCase()}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.infoText}>
           {time} {t('common.unit_min')} • {calories} {t('common.unit_kcal')}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
  },
  gridCard: {
    width: '48%',
    borderRadius: 24,
  },
  gridImage: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A3B3A515',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#A3B3A5',
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 26,
  },
  infoText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#64748B',
    opacity: 0.6,
  },
});
