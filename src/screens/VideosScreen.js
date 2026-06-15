import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { Play, ChevronLeft, Crown, CheckCircle } from 'lucide-react-native';
import { VIDEO_LIBRARY, extractYouTubeId } from '../utils/videoData';
import { translateContent } from '../services/translationService';

const { width } = Dimensions.get('window');
/** Standard 16:9 for YouTube videos */
const YOUTUBE_HEIGHT = Math.round(width * (9 / 16));
/** Taller area for direct/uploaded video files */
const VIDEO_AREA_HEIGHT = width * 1.2;
/** Space below scroll content so tab bar / home indicator doesn’t cover title/description */
const PLAYER_SCROLL_BOTTOM_PADDING = 140;

const getFilters = (t) => [
  { id: 'all', label: t('common.all') },
  { id: 'menstrual', label: t('phases.menstrual') },
  { id: 'follicular', label: t('phases.follicular') },
  { id: 'ovulation', label: t('phases.ovulation') },
  { id: 'luteal', label: t('phases.luteal') },
];

const getMealTypes = (t) => [
  { id: 'all', name: t('common.all') },
  { id: 'breakfast', name: t('dailylog.meal_types.breakfast') },
  { id: 'lunch', name: t('dailylog.meal_types.lunch') },
  { id: 'snack', name: t('dailylog.meal_types.snack') },
  { id: 'dinner', name: t('dailylog.meal_types.dinner') },
];


export const VideosScreen = ({ onBack, currentPhaseKey = 'follicular', videos = VIDEO_LIBRARY, recipes = [], isLocked = false, onSubscribe }) => {
  const { t, i18n } = useTranslation();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [displayVideo, setDisplayVideo] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState(currentPhaseKey || 'all');
  const [activeMealType, setActiveMealType] = useState('all');
  const [displayLibrary, setDisplayLibrary] = useState(videos);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const getMealLabel = (mealType) => {
    if (!mealType || mealType === 'none') return t('admin.my_phase');
    return t(`dailylog.meal_types.${mealType}`);
  };

  const getLocalizedVideoLabel = (v) => {
    if (!v) return '';
    const typeKey = v.contentType || 'recipe';
    return t(`videos.types.${typeKey}`, { defaultValue: v.category });
  };

  // ... (Translation effect remains same)
  React.useEffect(() => {
    const runId = ++translationRunId.current;
    setDisplayLibrary(videos);

    const translateLibrary = async () => {
      const translated = [];
      const chunkSize = 3;
      
      for (let i = 0; i < videos.length; i += chunkSize) {
        const chunk = videos.slice(i, i + chunkSize);
        const translatedChunk = await Promise.all(
          chunk.map((v) => translateContent(v, currentLanguage))
        );
        translated.push(...translatedChunk);
        
        if (translationRunId.current === runId) {
          setDisplayLibrary([...translated, ...videos.slice(translated.length)]);
        }
      }
    };

    translateLibrary();
    return () => {
      translationRunId.current += 1;
    };
  }, [currentLanguage, videos]);

  React.useEffect(() => {
    const currentLang = currentLanguage;
    const handleTranslation = async () => {
      if (!selectedVideo) {
        setDisplayVideo(null);
        return;
      }
      
      const translated = await translateContent(selectedVideo, currentLang);
      if (translated && translated.title) {
        setDisplayVideo(translated);
      } else {
        setDisplayVideo(selectedVideo);
      }
    };

    handleTranslation();
  }, [selectedVideo, currentLanguage]);

  const activeVideo = displayVideo || selectedVideo;

  const player = useVideoPlayer(activeVideo?.videoUrl || null, (player) => {
     player.loop = true;
     player.play();
  });

  const filters = useMemo(() => getFilters(t), [t]);
  const mealTypes = useMemo(() => getMealTypes(t), [t]);

  const visibleVideos = useMemo(() => {
    return displayLibrary.filter((video) => {
      const vidPhase = video.phaseKey || video.phase_key || '';
      const vidMeal = video.mealType || video.meal_type || '';
      
      const matchesPhase = activeFilterId === 'all' || 
                         vidPhase === activeFilterId ||
                         (activeFilterId !== 'all' && video.category?.toLowerCase().includes(activeFilterId.toLowerCase()));

      const matchesMealType = activeMealType === 'all' || 
                            vidMeal === activeMealType;

      return matchesPhase && matchesMealType;
    });
  }, [activeFilterId, activeMealType, displayLibrary]);

  if (selectedVideo) {
    const linkedRecipe = activeVideo?.contentType === 'recipe'
      ? (recipes.find(r => r.phaseKey === activeVideo.phaseKey && r.mealType === activeVideo.mealType)
        || recipes.find(r => r.phaseKey === activeVideo.phaseKey))
      : null;

    const isAudioOnly =
      activeVideo?.contentType === 'wellness' ||
      activeVideo?.category?.toLowerCase().includes('meditación') ||
      activeVideo?.category?.toLowerCase().includes('sonidos');

    const isYoutube =
      activeVideo?.isYoutube ||
      String(activeVideo?.videoUrl || activeVideo?.video_url || '').includes('youtu');

    const playerHeight = isYoutube ? YOUTUBE_HEIGHT : VIDEO_AREA_HEIGHT;

    return (
      <View style={styles.playerContainer}>
        {/* Floating overlay back button */}
        <Pressable
          onPress={() => {
            setSelectedVideo(null);
            setIsPlayerReady(false);
          }}
          style={styles.floatingBackButton}
        >
          <ChevronLeft size={24} color="#FFF" />
        </Pressable>

        <ScrollView
          style={styles.playerScroll}
          contentContainerStyle={[
            styles.playerScrollContent,
            { paddingBottom: PLAYER_SCROLL_BOTTOM_PADDING },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Video Player plays at absolute top */}
          <View style={[styles.videoArea, { height: playerHeight }]}>
            {isAudioOnly ? (
              <View style={styles.audioView}>
                <Image
                  source={{
                    uri:
                      activeVideo?.thumbnail ||
                      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
                  }}
                  style={styles.audioThumb}
                  resizeMode="cover"
                />
                <Text style={styles.audioSessionText}>{t('videos.audio_session')}</Text>
              </View>
            ) : isYoutube ? (
              <YoutubePlayer
                key={
                  activeVideo?.youtubeId ||
                  extractYouTubeId(
                    activeVideo?.youtubeUrl || activeVideo?.video_url || activeVideo?.videoUrl
                  )
                }
                height={YOUTUBE_HEIGHT}
                width={width}
                play={true}
                videoId={
                  activeVideo?.youtubeId ||
                  extractYouTubeId(
                    activeVideo?.youtubeUrl || activeVideo?.video_url || activeVideo?.videoUrl
                  )
                }
                onReady={() => setIsPlayerReady(true)}
              />
            ) : (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                allowsFullscreen
              />
            )}
          </View>

          {/* Details flow seamlessly under the video */}
          <View style={styles.detailsSection}>
            <View style={styles.tagRow}>
              <View style={styles.phaseTag}>
                <Text style={styles.tagText}>
                  {getLocalizedVideoLabel(activeVideo)}
                </Text>
              </View>
              <Text style={styles.durationDetail}>{activeVideo?.duration}</Text>
            </View>
            <Text style={styles.detailTitle}>{activeVideo?.title}</Text>
            <Text style={styles.detailDesc}>{activeVideo?.description}</Text>

            {linkedRecipe && (
              <View style={styles.recipeSection}>
                <View style={styles.recipeMacroRow}>
                  <Text style={styles.recipeMacroItem}>{linkedRecipe.time} min</Text>
                  <Text style={styles.recipeMacroDot}>·</Text>
                  <Text style={styles.recipeMacroItem}>{linkedRecipe.calories} kcal</Text>
                  <Text style={styles.recipeMacroDot}>·</Text>
                  <Text style={styles.recipeMacroItem}>{t('recipe_detail.high_protein')}</Text>
                </View>

                <Text style={styles.recipeSectionTitle}>{t('recipe_detail.ingredients')}</Text>
                {linkedRecipe.ingredients?.map((item, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <CheckCircle size={16} color="#A3B3A5" />
                    <Text style={styles.ingredientText}>{item}</Text>
                  </View>
                ))}

                <Text style={[styles.recipeSectionTitle, { marginTop: 24 }]}>{t('recipe_detail.preparation')}</Text>
                {linkedRecipe.instructions?.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <Text style={styles.stepNumber}>{idx + 1}.</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} scrollEnabled={!isLocked}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.title}>{t('videos.title')}</Text>
      </View>

      <View style={styles.filterWrapper}>
        <Text style={styles.filterTitle}>{t('recipes.filter_phase')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              style={[styles.filterPill, activeFilterId === filter.id && styles.filterPillActive]}
              onPress={() => setActiveFilterId(filter.id)}
            >
              <Text style={[styles.filterText, activeFilterId === filter.id && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.filterTitle}>{t('recipes.filter_meal')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {mealTypes.map((type) => (
            <Pressable
              key={type.id}
              style={[styles.mealPill, activeMealType === type.id && styles.mealPillActive]}
              onPress={() => setActiveMealType(type.id)}
            >
              <Text style={[styles.mealText, activeMealType === type.id && styles.mealTextActive]}>
                {type.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>


      <View style={styles.videoGrid}>
        {visibleVideos.map((video) => (
          <Pressable 
            key={video.id} 
            style={styles.videoCard} 
            onPress={() => {
              if (isLocked) {
                if (typeof onSubscribe === 'function') onSubscribe();
                return;
              }
              setSelectedVideo(video);
            }}
          >
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: video.thumbnail || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' }} style={styles.thumbnail} resizeMode="cover" />
              <View style={styles.playIconOverlay}>
                <Play size={20} color="#FFF" fill="#FFF" />
              </View>
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoCategory}>
                {getLocalizedVideoLabel(video)}
              </Text>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 160 }} />
    </ScrollView>

    {isLocked && (
      <View style={styles.lockedOverlay}>
        <View style={styles.lockCard}>
          <View style={styles.lockIconCircle}>
            <Crown size={32} color="#FFF" fill="#FFD700" />
          </View>
          <Text style={styles.lockTitle}>{t('subscription.unlock_premium_videos')}</Text>
          <Text style={styles.lockSubtitle}>
            {t('subscription.unlock_videos_desc')}
          </Text>
          <Pressable style={styles.subscribeBtn} onPress={onSubscribe}>
            <Text style={styles.subscribeBtnText}>{(t('subscription.subscribe_now')).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>
    )}
  </View>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 28, paddingTop: 60, marginBottom: 32 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#F1F1E8' },
  title: { fontSize: 32, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface },
  filterWrapper: { marginBottom: 24 },
  filterScroll: { paddingHorizontal: 28, gap: 12 },
  filterTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    marginLeft: 28,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  filterPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F1E8' },
  filterPillActive: { backgroundColor: '#A3B3A5', borderColor: '#A3B3A5' },
  filterText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: colors.on_surface_variant },
  filterTextActive: { color: '#FFF' },
  mealPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  mealPillActive: {
    backgroundColor: '#968DA1',
    borderColor: '#968DA1',
  },
  mealText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface_variant,
  },
  mealTextActive: {
    color: '#FFF',
  },
  videoGrid: { paddingHorizontal: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  videoCard: { width: (width - 72) / 2, marginBottom: 32 },
  thumbnailWrapper: { width: '100%', height: 110, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  thumbnail: { width: '100%', height: '100%', opacity: 0.85 },
  playIconOverlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -10, marginLeft: -10 },
  videoInfo: { marginTop: 12 },
  videoCategory: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#A3B3A5', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  videoTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.on_surface, lineHeight: 20 },
  playerContainer: { flex: 1, backgroundColor: colors.background },
  playerScroll: { flex: 1 },
  playerScrollContent: {
    flexGrow: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F1F1E8' },
  playerNavTitle: { flex: 1, fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface },
  videoArea: { width: '100%', height: VIDEO_AREA_HEIGHT, backgroundColor: '#000' },
  detailsSection: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 8 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  phaseTag: { backgroundColor: '#A3B3A520', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 12 },
  tagText: { color: '#A3B3A5', fontSize: 11, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase' },
  durationDetail: { color: colors.on_surface_variant, fontSize: 13, fontFamily: 'Outfit_600SemiBold', opacity: 0.6 },
  detailTitle: { fontSize: 28, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface, marginBottom: 16 },
  detailDesc: { fontSize: 15, fontFamily: 'Outfit_500Medium', color: colors.on_surface_variant, lineHeight: 26 },
  audioView: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  audioThumb: { width: 160, height: 160, borderRadius: 80, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  audioSessionText: { fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 242, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  lockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  lockIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: 12,
  },
  lockSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    opacity: 0.8,
  },
  subscribeBtn: {
    width: '100%',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  subscribeBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#F1F1E8',
    paddingTop: 24,
  },
  recipeMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  recipeMacroItem: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface_variant,
  },
  recipeMacroDot: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#A3B3A5',
  },
  recipeSectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    marginBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ingredientText: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
    lineHeight: 22,
    opacity: 0.85,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: '#A3B3A5',
    width: 20,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
    lineHeight: 24,
    opacity: 0.85,
  },
});


