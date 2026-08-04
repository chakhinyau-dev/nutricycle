import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  Image, 
  Dimensions,
  Share,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { translateContent } from '../services/translationService';
import { getRecipeImageSource } from '../services/recipeService';

const { width } = Dimensions.get('window');

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const RecipeDetailScreen = ({ recipe, onBack, isSaved = false, onToggleSave }) => {
  const { t, i18n } = useTranslation();
  const [displayRecipe, setDisplayRecipe] = useState(recipe);
  const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  // Reset display state when source recipe changes
  useEffect(() => {
    setDisplayRecipe(recipe);
  }, [recipe]);

  // Handle Auto-Translation
  useEffect(() => {
    const runId = ++translationRunId.current;
    const handleTranslation = async () => {
      if (!recipe) return;
      
      console.log('[RecipeDetail] Requesting translation for:', recipe.title, 'to:', currentLanguage);
      
      const translated = await translateContent(recipe, currentLanguage);
      
      if (translationRunId.current === runId && translated && translated.title !== recipe?.title) {
        setDisplayRecipe(translated);
      }
    };

    setDisplayRecipe(recipe);
    handleTranslation();
    return () => {
      translationRunId.current += 1;
    };
  }, [recipe, currentLanguage]);

  const data = displayRecipe || recipe || {
    title: 'Salmon with Asparagus',
    calories: '540',
    time: '30',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
    category: 'Ovulation Phase',
    ingredients: [],
    instructions: []
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${t('common.check_this')}: ${data.title}!`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const imageSource = getRecipeImageSource(data);
  const videoUrl = data.videoUrl || data.video_url || data.youtubeUrl;
  const isYoutube = videoUrl && String(videoUrl).includes('youtu');
  const youtubeId = isYoutube ? extractYouTubeId(videoUrl) : null;

  const player = useVideoPlayer(videoUrl && !isYoutube ? videoUrl : null, (player) => {
     player.loop = true;
     player.play();
  });

  const videoHeight = isYoutube ? Math.round(width * (9 / 16)) : 400;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <View style={[styles.hero, videoUrl && { height: videoHeight }]}>
          {videoUrl ? (
            isYoutube ? (
              <YoutubePlayer
                height={videoHeight}
                width={width}
                play={true}
                videoId={youtubeId}
              />
            ) : (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                allowsFullscreen
              />
            )
          ) : (
            <Image source={imageSource} style={styles.heroImage} />
          )}
          <View style={styles.heroOverlay} />
          
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.headerBtn}>
              <ArrowLeft size={24} color="#FFF" />
            </Pressable>
            <View style={styles.headerRight}>
              {onToggleSave && (
                <Pressable style={styles.headerBtn} onPress={onToggleSave}>
                  <Bookmark
                    size={22}
                    color="#FFF"
                    fill={isSaved ? '#FFF' : 'none'}
                  />
                </Pressable>
              )}
              <Pressable style={styles.headerBtn} onPress={onShare}>
                <Share2 size={22} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {!videoUrl && (
            <View style={styles.heroContent}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>
                  {data.phaseKey ? t(`phases.${data.phaseKey}`) : data.category}
                </Text>
              </View>
              <Text style={styles.recipeTitle}>{data.title}</Text>
            </View>
          )}
        </View>

        {/* Title + stats — flow directly below video/image with no container break */}
        <View style={styles.metaBlock}>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>
              {data.phaseKey ? t(`phases.${data.phaseKey}`) : data.category}
            </Text>
          </View>
          {videoUrl && (
            <Text style={styles.recipeTitleDark}>{data.title}</Text>
          )}
          <Text style={styles.statText}>
            {(() => {
              const prot = data.protein || Math.max(10, Math.round(Number(data.calories) * 0.08));
              const fat = data.fat || Math.max(5, Math.round(Number(data.calories) * 0.035));
              const carbs = data.carbs || Math.max(15, Math.round((Number(data.calories) - (prot * 4) - (fat * 9)) / 4));
              return currentLanguage.toLowerCase().startsWith('es')
                ? `${data.time} min • ${data.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g grasa`
                : `${data.time} min • ${data.calories} kcal • ${prot}g prot • ${carbs}g carb • ${fat}g fat`;
            })()}
          </Text>
        </View>

        <View style={styles.mainContent}>
          {/* Ingredients Section */}
          <View style={[styles.section, { marginBottom: 48 }]}>
            <Text style={styles.sectionTitle}>{t('recipe_detail.ingredients')}</Text>
            <View style={{ height: 32 }} />
            {data.ingredients && data.ingredients.length > 0 ? (
              data.ingredients.map((item, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <CheckCircle2 size={18} color="#A3B3A5" />
                  <Text style={styles.ingredientText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.ingredientText, { opacity: 0.5 }]}>
                {t('recipe_detail.no_ingredients', { defaultValue: 'No ingredients recorded.' })}
              </Text>
            )}
          </View>

          {/* Preparation / Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipe_detail.preparation')}</Text>
            <View style={{ height: 32 }} />
            {data.instructions?.map((step, index) => (
              <View key={index} style={styles.instructionStep}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Key Ingredients Collapsible Section */}
          <View style={[styles.section, { marginTop: 40, borderTopWidth: 1, borderTopColor: '#F1F1E8', paddingTop: 32 }]}>
            <Pressable 
              style={styles.collapsibleHeader} 
              onPress={() => setIsIngredientsExpanded(!isIngredientsExpanded)}
            >
              <Text style={styles.sectionTitle}>{t('recipe_detail.key_ingredients')}</Text>
              {isIngredientsExpanded ? (
                <ChevronUp size={24} color="#1A1A1A" />
              ) : (
                <ChevronDown size={24} color="#1A1A1A" />
              )}
            </Pressable>

            {isIngredientsExpanded && (
              <View style={styles.keyIngredientsContainer}>
                {data.keyIngredients && data.keyIngredients.length > 0 ? (
                  data.keyIngredients.slice(0, 3).map((item, idx) => (
                    <View key={idx} style={styles.ingredientCard}>
                      <Image source={{ uri: item.image }} style={styles.cardIngredientImage} />
                      <View style={styles.cardTextContainer}>
                        <Text style={styles.cardIngredientName}>{item.name}</Text>
                        <Text style={styles.cardIngredientNote}>{item.note || item.benefit}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.ingredientText, { opacity: 0.5 }]}>
                    {t('recipe_detail.no_key_ingredients', { defaultValue: 'No key nutritional info for this recipe.' })}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F2' },
  hero: { height: 400, width: '100%' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 28, alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { position: 'absolute', bottom: 40, left: 28, right: 28 },
  phaseBadge: { backgroundColor: '#A3B3A5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
  phaseBadgeText: { fontFamily: 'Outfit_700Bold', fontSize: 10, color: '#FFF', letterSpacing: 1, textTransform: 'uppercase' },
  recipeTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 36, color: '#FFFFFF', lineHeight: 42 },
  recipeTitleDark: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#1A1A1A', lineHeight: 38, marginBottom: 8 },
  metaBlock: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 4 },
  statText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#64748B', opacity: 0.7, letterSpacing: 0.5 },
  mainContent: { paddingHorizontal: 28, paddingTop: 16 },
  sectionTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 28, color: '#1A1A1A' },
  instructionStep: { marginBottom: 32, flexDirection: 'row' },
  stepNumber: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18, color: '#A3B3A5', marginRight: 16, width: 24 },
  stepText: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#1A1A1A', lineHeight: 26, opacity: 0.8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ingredientText: { fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#1A1A1A', marginLeft: 16, opacity: 0.8 },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  keyIngredientsContainer: {
    marginTop: 20,
    gap: 16,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F2', // cream background
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  cardIngredientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardIngredientName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardIngredientNote: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});
