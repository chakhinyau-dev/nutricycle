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
  Alert,
  ActivityIndicator
} from 'react-native';
import { colors } from '../theme/colors';
import { 
  Clock, 
  Flame, 
  Zap, 
  ArrowLeft,
  Share2,
  CheckCircle2
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { translateContent } from '../services/translationService';
import { getRecipeImageSource } from '../services/recipeService';

const { width } = Dimensions.get('window');

export const RecipeDetailScreen = ({ recipe, onBack }) => {
  const { t, i18n } = useTranslation();
  const [displayRecipe, setDisplayRecipe] = useState(recipe);
  const [isTranslating, setIsTranslating] = useState(false);
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
      
      // Only translate if the current display is definitely the same as input
      // This prevents loops or redundant calls
      setIsTranslating(true);
      console.log('[RecipeDetail] Requesting translation for:', recipe.title, 'to:', currentLanguage);
      
      const translated = await translateContent(recipe, currentLanguage);
      
      if (translationRunId.current === runId && translated && translated.title !== recipe?.title) {
        setDisplayRecipe(translated);
      }
      if (translationRunId.current === runId) {
        setIsTranslating(false);
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
      // Alert.alert(t('common.success'), t('common.shared_success')); // Optional feedback
    } catch (error) {
      console.log(error.message);
    }
  };

  const imageSource = getRecipeImageSource(data);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image source={imageSource} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.headerBtn}>
              <ArrowLeft size={24} color="#FFF" />
            </Pressable>
            <View style={styles.headerRight}>
              <Pressable style={styles.headerBtn} onPress={onShare}>
                <Share2 size={22} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseBadgeText}>{data.category}</Text>
            </View>
            <Text style={styles.recipeTitle}>{data.title}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
           <Text style={styles.statText}>
              {data.time} {t('common.unit_min')} • {data.calories} {t('common.unit_kcal')} • {t('recipe_detail.high_protein')}
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
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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
  statsRow: { paddingHorizontal: 28, paddingVertical: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F1E8' },
  statText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#64748B', opacity: 0.7, letterSpacing: 0.5 },
  mainContent: { paddingHorizontal: 28, paddingTop: 48 },
  sectionTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 28, color: '#1A1A1A' },
  instructionStep: { marginBottom: 32, flexDirection: 'row' },
  stepNumber: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18, color: '#A3B3A5', marginRight: 16, width: 24 },
  stepText: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#1A1A1A', lineHeight: 26, opacity: 0.8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ingredientText: { fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#1A1A1A', marginLeft: 16, opacity: 0.8 },
});
