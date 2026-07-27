import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, Clock, Bookmark, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ARTICLE_LIBRARY } from '../utils/articleData';
import { translateContent } from '../services/translationService';

export const ArticlesScreen = ({ onBack, articles = ARTICLE_LIBRARY }) => {
  const { t, i18n } = useTranslation();
  const [displayArticles, setDisplayArticles] = useState(articles);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    const runId = ++translationRunId.current;
    setDisplayArticles(articles);

    const translateArticles = async () => {
      const translated = [];
      for (const article of articles) {
        translated.push(await translateContent(article, currentLanguage));
        if (translationRunId.current === runId) {
          setDisplayArticles([...translated]);
        }
      }
    };

    translateArticles();
    return () => {
      translationRunId.current += 1;
    };
  }, [articles, currentLanguage]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.title}>{t('articles.title')}</Text>
      </View>

      <View style={styles.featuredArea}>
        <Text style={styles.sectionTitle}>{t('articles.section_title')}</Text>
        {displayArticles.map((article) => (
          <Pressable key={article.id} style={styles.articleCard}>
            <Image source={{ uri: article.image }} style={styles.articleImage} />
            <View style={styles.articleContent}>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{article.tag}</Text>
                </View>
                <Pressable>
                  <Bookmark size={16} color={colors.on_surface_variant} />
                </Pressable>
              </View>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleExcerpt} numberOfLines={2}>
                {article.excerpt}
              </Text>
              <View style={styles.articleFooter}>
                <View style={styles.timeRow}>
                  <Clock size={14} color={colors.on_surface_variant} />
                  <Text style={styles.timeText}>{article.time}</Text>
                </View>
                <Pressable>
                  <Share2 size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 38,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    marginBottom: 20,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  articleImage: {
    width: '100%',
    height: 180,
  },
  articleContent: {
    padding: 20,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: colors.primary_container,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  articleTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
    marginBottom: 8,
  },
  articleExcerpt: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    lineHeight: 20,
    marginBottom: 16,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8F8F8',
    paddingTop: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginLeft: 6,
  },
});
