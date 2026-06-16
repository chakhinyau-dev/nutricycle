import React from 'react';
import { StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react-native';
import { getRecipeImageSource, getRecipeVideoThumbnail } from '../services/recipeService';

export const RecipeCard = ({
  title,
  calories,
  time,
  image,
  category,
  phaseKey,
  youtubeUrl,
  videoUrl,
  grid = false,
  onPress,
}) => {
  const { t } = useTranslation();
  const displayCategory = phaseKey ? t(`phases.${phaseKey}`) : category;

  const thumbUrl = getRecipeVideoThumbnail({ youtubeUrl, videoUrl });
  const imageSource = thumbUrl ? { uri: thumbUrl } : getRecipeImageSource(image);
  const hasVideo = !!thumbUrl;

  return (
    <Pressable
      style={[styles.card, grid && styles.gridCard]}
      onPress={onPress}
    >
      <View style={grid ? styles.gridImageWrap : styles.imageWrap}>
        <Image source={imageSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {hasVideo && (
          <View style={styles.playOverlay}>
            <View style={styles.playBtn}>
              <Play size={grid ? 14 : 20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        )}
      </View>

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
  gridCard: {
    width: '48%',
    borderRadius: 24,
  },
  imageWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
  },
  gridImageWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8F9FA',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
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
