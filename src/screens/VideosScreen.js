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
import { Play, ChevronLeft, Clock, Sparkles, LayoutGrid, Coffee, Utensils, Apple, Moon } from 'lucide-react-native';
import { VIDEO_LIBRARY, extractYouTubeId } from '../utils/videoData';
import { PHASE_LABELS } from '../utils/cycle';
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


export const VideosScreen = ({ onBack, currentPhaseKey = 'follicular', videos = VIDEO_LIBRARY }) => {
  const { t, i18n } = useTranslation();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [displayVideo, setDisplayVideo] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState('all');
  const [activeMealType, setActiveMealType] = useState('all');
  const [displayLibrary, setDisplayLibrary] = useState(videos);
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const getMealLabel = (mealType) => {
    if (!mealType || mealType === 'none') return t('admin.my_phase');
    return t(`dailylog.meal_types.${mealType}`);
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
          <View style={styles.playerHeader}>
            <Pressable
              onPress={() => {
                setSelectedVideo(null);
                setIsPlayerReady(false);
              }}
              style={styles.backCircle}
            >
              <ChevronLeft size={24} color={colors.on_surface} />
            </Pressable>
            <Text style={styles.playerNavTitle} numberOfLines={2}>
              {activeVideo?.title || selectedVideo.title}
            </Text>
          </View>

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

          <View style={styles.detailsSection}>
            <View style={styles.tagRow}>
              <View style={styles.phaseTag}>
                <Text style={styles.tagText}>
                  {t('videos.category_prefix', {
                    phase: t(`phases.${activeVideo?.phaseKey || 'all'}`),
                    meal: getMealLabel(activeVideo?.mealType || 'snack'),
                  })}
                </Text>
              </View>
              <Text style={styles.durationDetail}>{activeVideo?.duration}</Text>
            </View>
            <Text style={styles.detailTitle}>{activeVideo?.title}</Text>
            <Text style={styles.detailDesc}>{activeVideo?.description}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
          <Pressable key={video.id} style={styles.videoCard} onPress={() => setSelectedVideo(video)}>
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: video.thumbnail || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' }} style={styles.thumbnail} resizeMode="cover" />
              <View style={styles.playIconOverlay}>
                <Play size={20} color="#FFF" fill="#FFF" />
              </View>
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoCategory}>
                {t('videos.category_prefix', { 
                   phase: t(`phases.${video.phaseKey}`).toLowerCase(),
                   meal: getMealLabel(video.mealType || 'snack')
                })}
              </Text>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 160 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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
  playerContainer: { flex: 1, backgroundColor: '#FAF9F6' },
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
});


