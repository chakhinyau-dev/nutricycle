import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from 'react-native';
import { ChevronLeft, Bookmark, Heart, Clock, Zap } from 'lucide-react-native';

import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { translateContent } from '../services/translationService';
import { getRecipeImageSource } from '../services/recipeService';

export const SavedRecipesScreen = ({ onBack, onNavigate, recipes = [] }) => {
  const { t, i18n } = useTranslation();
  const [displayRecipes, setDisplayRecipes] = useState(recipes);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    const runId = ++translationRunId.current;
    setDisplayRecipes(recipes);

    const translateSavedRecipes = async () => {
      const translated = [];
      for (const recipe of recipes) {
        translated.push(await translateContent(recipe, currentLanguage));
        if (translationRunId.current === runId) {
          setDisplayRecipes([...translated, ...recipes.slice(translated.length)]);
        }
      }
    };

    translateSavedRecipes();

    return () => {
      translationRunId.current += 1;
    };
  }, [recipes, currentLanguage]);

  const savedRecipes = displayRecipes;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('saved_recipes.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Bookmark size={32} color={colors.primary} fill={colors.primary} />
          <Text style={styles.introTitle}>{t('saved_recipes.intro_title')}</Text>
          <Text style={styles.introSub}>
            {t('saved_recipes.intro_sub')}
          </Text>
        </View>

        <View style={styles.grid}>
          {savedRecipes.map((recipe) => (
            <Pressable key={recipe.id} style={styles.card} onPress={() => onNavigate('recipeDetail', recipe)}>
              <Image source={getRecipeImageSource(recipe)} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <View style={styles.tagRow}>
                  <View style={styles.phaseTag}>
                    <Text style={styles.phaseTagText}>{recipe.category}</Text>
                  </View>
                  <Heart size={16} color="#EB5757" fill="#EB5757" />
                </View>
                <Text style={styles.cardTitle}>{recipe.title}</Text>
                <View style={styles.metaRow}>
                  <Clock size={12} color={colors.on_surface_variant} />
                  <Text style={styles.metaText}>{recipe.time} min</Text>
                  <View style={styles.dot} />
                  <Zap size={12} color={colors.on_surface_variant} />
                  <Text style={styles.metaText}>{recipe.calories} kcal</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {!savedRecipes.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('saved_recipes.empty')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
  },
  content: {
    padding: 24,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  introTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    marginTop: 16,
    marginBottom: 8,
  },
  introSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  grid: {
    gap: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 20,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseTag: {
    backgroundColor: colors.primary_container,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  phaseTagText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.primary,
  },
  cardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginLeft: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
    marginHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.on_surface_variant,
  },
});
