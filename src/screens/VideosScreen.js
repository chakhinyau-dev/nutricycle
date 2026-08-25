import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  TextInput,
  Alert,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { Play, ChevronLeft, CheckCircle, Search, Key } from 'lucide-react-native';
import { VIDEO_LIBRARY, extractYouTubeId } from '../utils/videoData';
import { translateContent } from '../services/translationService';

const { width } = Dimensions.get('window');
const YOUTUBE_HEIGHT = Math.round(width * (9 / 16));

const computeMacros = (calories) => ({
  p: Math.round((calories * 0.24) / 4),
  c: Math.round((calories * 0.46) / 4),
  g: Math.round((calories * 0.30) / 9),
});
const VIDEO_AREA_HEIGHT = width * 1.2;
const PLAYER_SCROLL_BOTTOM_PADDING = 140;

const PHASE_TAB_COLORS = {
  menstrual:  { solid: '#E8A0A2', tint: 'rgba(232,160,162,0.18)', border: 'rgba(232,160,162,0.6)' },
  follicular: { solid: '#A3B3A5', tint: 'rgba(163,179,165,0.18)', border: 'rgba(163,179,165,0.6)' },
  ovulation:  { solid: '#C9A84C', tint: 'rgba(201,168,76,0.18)',  border: 'rgba(201,168,76,0.6)'  },
  luteal:     { solid: '#968DA1', tint: 'rgba(150,141,161,0.18)', border: 'rgba(150,141,161,0.6)' },
};

const PHASE_COUNT = 5;
const MEAL_COUNT  = 6;
const MAX_CARDS   = 20;

const getFilters = (t) => [
  { id: 'all',        label: t('common.all') },
  { id: 'menstrual',  label: t('phases.menstrual') },
  { id: 'follicular', label: t('phases.follicular') },
  { id: 'ovulation',  label: t('phases.ovulation') },
  { id: 'luteal',     label: t('phases.luteal') },
];

const getMealTypes = (t) => [
  { id: 'all',       name: t('common.all') },
  { id: 'prep',      name: t('dailylog.meal_types.prep') },
  { id: 'breakfast', name: t('dailylog.meal_types.breakfast') },
  { id: 'lunch',     name: t('dailylog.meal_types.lunch') },
  { id: 'snack',     name: t('dailylog.meal_types.snack') },
  { id: 'dinner',    name: t('dailylog.meal_types.dinner') },
];


export const VideosScreen = ({ onBack, currentPhaseKey = 'follicular', videos = VIDEO_LIBRARY, recipes = [], isLocked = false, onSubscribe, initialVideo = null }) => {
  const { t, i18n } = useTranslation();
  // A locked user can reach this screen directly via a deep link (e.g.
  // Dashboard's "Today's Meals" shortcut sets initialVideo), which used to
  // bypass the grid's own tap-gate entirely and open the player anyway.
  // Refusing to seed selectedVideo when locked closes that gap.
  const [selectedVideo, setSelectedVideo] = useState(isLocked ? null : initialVideo);
  const [displayVideo, setDisplayVideo] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState('all');
  const [activeMealType, setActiveMealType] = useState('all');
  const [displayLibrary, setDisplayLibrary] = useState(videos);
  const [filterVersion, setFilterVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const translationRunId = useRef(0);
  const currentLanguage = i18n.resolvedLanguage || i18n.language;

  const showLockedAlert = () => {
    Alert.alert(
      t('videos.premium_locked_title'),
      t('videos.premium_locked_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('subscription.subscribe_now'), onPress: () => { if (typeof onSubscribe === 'function') onSubscribe(); } },
      ]
    );
  };

  useEffect(() => {
    if (isLocked && initialVideo) {
      showLockedAlert();
    }
    // Only ever meant to run once, checking how this screen was entered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Animation values ───────────────────────────────────────────────
  const headerAnim = useRef({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(-18),
  }).current;

  const phaseLabel = useRef(new Animated.Value(0)).current;
  const phasePillAnims = useRef(
    Array.from({ length: PHASE_COUNT }, () => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.72),
    }))
  ).current;
  const phaseSelectScales = useRef(
    Array.from({ length: PHASE_COUNT }, () => new Animated.Value(1))
  ).current;

  const mealLabel = useRef(new Animated.Value(0)).current;
  const mealPillAnims = useRef(
    Array.from({ length: MEAL_COUNT }, () => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.72),
    }))
  ).current;
  const mealPressScales = useRef(
    Array.from({ length: MEAL_COUNT }, () => new Animated.Value(1))
  ).current;

  const cardAnims = useRef(
    Array.from({ length: MAX_CARDS }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(24),
    }))
  ).current;
  // ──────────────────────────────────────────────────────────────────

  const getMealLabel = (mealType) => {
    if (!mealType || mealType === 'none') return t('admin.my_phase');
    return t(`dailylog.meal_types.${mealType}`);
  };

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
    return () => { translationRunId.current += 1; };
  }, [currentLanguage, videos]);

  React.useEffect(() => {
    const currentLang = currentLanguage;
    const handleTranslation = async () => {
      if (!selectedVideo) { setDisplayVideo(null); return; }
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

  const filters   = useMemo(() => getFilters(t), [t]);
  const mealTypes = useMemo(() => getMealTypes(t), [t]);

  const visibleVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return displayLibrary.filter((video) => {
      const vidPhase = video.phaseKey || video.phase_key || '';
      const vidMeal  = video.mealType  || video.meal_type  || '';
      const isPrep = vidMeal === 'prep';
      const matchesSearch   = !query || video.title?.toLowerCase().includes(query);
      const matchesPhase    = activeFilterId === 'all' ||
                              isPrep ||
                              vidPhase === activeFilterId ||
                              (activeFilterId !== 'all' && video.category?.toLowerCase().includes(activeFilterId.toLowerCase()));
      const matchesMealType = activeMealType === 'all' || vidMeal === activeMealType;
      return matchesSearch && matchesPhase && matchesMealType;
    });
  }, [activeFilterId, activeMealType, displayLibrary, searchQuery]);

  // Mount entrance
  useEffect(() => {
    // Header slides down
    Animated.timing(headerAnim.opacity,    { toValue: 1, duration: 280, useNativeDriver: true }).start();
    Animated.spring(headerAnim.translateY, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }).start();

    // Phase filter label
    Animated.timing(phaseLabel, { toValue: 1, duration: 200, delay: 200, useNativeDriver: true }).start();

    // Phase pills stagger pop-in
    Animated.sequence([
      Animated.delay(240),
      Animated.stagger(50, phasePillAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(a.scale,   { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
        ])
      )),
    ]).start();

    // Meal type label
    Animated.timing(mealLabel, { toValue: 1, duration: 200, delay: 420, useNativeDriver: true }).start();

    // Meal pills stagger pop-in
    Animated.sequence([
      Animated.delay(440),
      Animated.stagger(45, mealPillAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(a.scale,   { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
        ])
      )),
    ]).start();

    // Video cards stagger slide-up
    Animated.sequence([
      Animated.delay(580),
      Animated.stagger(50, cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, []);

  // Re-stagger video cards on filter change
  useEffect(() => {
    if (filterVersion === 0) return;
    Animated.sequence([
      Animated.delay(60),
      Animated.stagger(50, cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, [filterVersion]);

  // Phase pill tap: reset cards → update state → bounce tapped pill
  const handlePhaseSelect = (filterId, index) => {
    cardAnims.forEach(a => { a.opacity.setValue(0); a.translateY.setValue(24); });
    setActiveFilterId(filterId);
    setFilterVersion(v => v + 1);
    Animated.sequence([
      Animated.spring(phaseSelectScales[index], { toValue: 1.14, friction: 5, tension: 160, useNativeDriver: true }),
      Animated.spring(phaseSelectScales[index], { toValue: 1,    friction: 7, tension: 90,  useNativeDriver: true }),
    ]).start();
  };

  // Meal pill tap: reset cards → update state
  const handleMealSelect = (typeId, index) => {
    cardAnims.forEach(a => { a.opacity.setValue(0); a.translateY.setValue(24); });
    setActiveMealType(typeId);
    setFilterVersion(v => v + 1);
  };

  const handleMealPressIn  = (index) => {
    Animated.spring(mealPressScales[index], { toValue: 0.88, friction: 8, tension: 200, useNativeDriver: true }).start();
  };
  const handleMealPressOut = (index) => {
    Animated.spring(mealPressScales[index], { toValue: 1,    friction: 6, tension: 100, useNativeDriver: true }).start();
  };

  // ── Video player view (no animations needed) ───────────────────────
  if (selectedVideo) {
    const videoIngredients = activeVideo?.ingredients?.length ? activeVideo.ingredients : null;
    const videoInstructions = activeVideo?.instructions?.length ? activeVideo.instructions : null;
    const hasEmbeddedRecipe = !!(videoIngredients || videoInstructions);

    const linkedRecipe = (() => {
      if (hasEmbeddedRecipe) return null;
      if (activeVideo?.contentType !== 'recipe' || !recipes?.length) return null;
      const exact = recipes.find(r => r.phaseKey === activeVideo.phaseKey && r.mealType === activeVideo.mealType);
      if (exact) return exact;
      const byPhase = recipes.find(r => r.phaseKey === activeVideo.phaseKey);
      if (byPhase) return byPhase;
      return recipes[0] || null;
    })();

    const recipeIngredients = videoIngredients || linkedRecipe?.ingredients || [];
    const recipeInstructions = videoInstructions || linkedRecipe?.instructions || [];
    const hasRecipeContent = !!(recipeIngredients.length || recipeInstructions.length);
    const coachingTips = activeVideo?.coachingTips || linkedRecipe?.coachingTips || null;

    const videoCals  = linkedRecipe?.calories || activeVideo?.calories || 0;
    const videoMacros = computeMacros(videoCals);
    const macroLine  = videoCals > 0
      ? `${videoCals} kcal · P ${videoMacros.p}g · C ${videoMacros.c}g · G ${videoMacros.g}g`
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
        <Pressable
          onPress={() => { setSelectedVideo(null); setIsPlayerReady(false); }}
          style={styles.floatingBackButton}
        >
          <ChevronLeft size={24} color="#FFF" />
        </Pressable>

        <ScrollView
          style={styles.playerScroll}
          contentContainerStyle={[styles.playerScrollContent, { paddingBottom: PLAYER_SCROLL_BOTTOM_PADDING }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={[styles.videoArea, { height: playerHeight }]}>
            {isAudioOnly ? (
              <View style={styles.audioView}>
                <Image
                  source={{ uri: activeVideo?.thumbnail || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800' }}
                  style={styles.audioThumb}
                  resizeMode="cover"
                />
                <Text style={styles.audioSessionText}>{t('videos.audio_session')}</Text>
              </View>
            ) : isYoutube ? (
              <YoutubePlayer
                key={activeVideo?.youtubeId || extractYouTubeId(activeVideo?.youtubeUrl || activeVideo?.video_url || activeVideo?.videoUrl)}
                height={YOUTUBE_HEIGHT}
                width={width}
                play={true}
                videoId={activeVideo?.youtubeId || extractYouTubeId(activeVideo?.youtubeUrl || activeVideo?.video_url || activeVideo?.videoUrl)}
                onReady={() => setIsPlayerReady(true)}
              />
            ) : (
              <VideoView player={player} style={{ width: '100%', height: '100%' }} allowsFullscreen />
            )}

            {macroLine && (
              <View style={styles.videoMacroOverlay}>
                <Text style={styles.videoMacroText}>{macroLine}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailTitle}>{activeVideo?.title}</Text>
            {!hasRecipeContent && (
              <Text style={styles.detailDesc}>{activeVideo?.description}</Text>
            )}

            {hasRecipeContent && (
              <View style={styles.recipeSection}>
                {linkedRecipe && (
                  <View style={styles.recipeMacroRow}>
                    <Text style={styles.recipeMacroItem}>{linkedRecipe.time} min</Text>
                    <Text style={styles.recipeMacroDot}>·</Text>
                    <Text style={styles.recipeMacroItem}>{linkedRecipe.calories} kcal</Text>
                    <Text style={styles.recipeMacroDot}>·</Text>
                    <Text style={styles.recipeMacroItem}>{t('recipe_detail.high_protein')}</Text>
                  </View>
                )}

                {recipeIngredients.length > 0 && (
                  <>
                    <Text style={styles.recipeSectionTitle}>{t('recipe_detail.ingredients')}</Text>
                    {recipeIngredients.map((item, idx) => (
                      <View key={idx} style={styles.ingredientRow}>
                        <CheckCircle size={16} color="#A3B3A5" />
                        <Text style={styles.ingredientText}>{item}</Text>
                      </View>
                    ))}
                  </>
                )}

                {recipeInstructions.length > 0 && (
                  <>
                    <Text style={[styles.recipeSectionTitle, { marginTop: 24 }]}>{t('recipe_detail.preparation')}</Text>
                    {recipeInstructions.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <Text style={styles.stepNumber}>{idx + 1}.</Text>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {coachingTips ? (
              <View style={styles.coachingTipsBox}>
                <Text style={styles.recipeSectionTitle}>{t('recipe_detail.coaching_tips')}</Text>
                <View style={{ height: 12 }} />
                <Text style={styles.stepText}>{coachingTips}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Main list view ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header slides down from above */}
        <Animated.View style={[styles.header, { opacity: headerAnim.opacity, transform: [{ translateY: headerAnim.translateY }] }]}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>{t('videos.title')}</Text>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.on_surface_variant} opacity={0.5} />
            <TextInput
              placeholder={t('videos.search_placeholder')}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Phase filter pills */}
        <View style={styles.filterWrapper}>
          <Animated.Text style={[styles.filterTitle, { opacity: phaseLabel }]}>
            {t('recipes.filter_phase')}
          </Animated.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map((filter, index) => {
              const pc = PHASE_TAB_COLORS[filter.id];
              const isActive = activeFilterId === filter.id;
              const pa = phasePillAnims[index];
              return (
                <Animated.View
                  key={filter.id}
                  style={{
                    opacity:   pa.opacity,
                    transform: [{ scale: Animated.multiply(pa.scale, phaseSelectScales[index]) }],
                  }}
                >
                  <Pressable
                    style={[
                      styles.filterPill,
                      pc && !isActive && { backgroundColor: pc.tint, borderColor: pc.border },
                      pc && isActive  && { backgroundColor: pc.solid, borderColor: pc.solid },
                      !pc && isActive && styles.filterPillActive,
                    ]}
                    onPress={() => handlePhaseSelect(filter.id, index)}
                  >
                    <Text style={[
                      styles.filterText,
                      pc && !isActive && { color: pc.solid },
                      isActive && styles.filterTextActive,
                    ]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal type filter pills */}
        <View style={{ marginBottom: 32 }}>
          <Animated.Text style={[styles.filterTitle, { opacity: mealLabel }]}>
            {t('recipes.filter_meal')}
          </Animated.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {mealTypes.map((type, index) => (
              <Animated.View
                key={type.id}
                style={{
                  opacity:   mealPillAnims[index].opacity,
                  transform: [{ scale: Animated.multiply(mealPillAnims[index].scale, mealPressScales[index]) }],
                }}
              >
                <Pressable
                  style={[styles.mealPill, activeMealType === type.id && styles.mealPillActive]}
                  onPress={() => handleMealSelect(type.id, index)}
                  onPressIn={() => handleMealPressIn(index)}
                  onPressOut={() => handleMealPressOut(index)}
                >
                  <Text style={[styles.mealText, activeMealType === type.id && styles.mealTextActive]}>
                    {type.name}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Video cards — stagger in, re-stagger on filter change */}
        <View style={styles.videoGrid}>
          {visibleVideos.map((video, i) => {
            const ca = i < MAX_CARDS ? cardAnims[i] : null;
            return (
              <Animated.View
                key={video.id}
                style={[
                  { width: (width - 48) / 2, marginBottom: 28 },
                  ca ? { opacity: ca.opacity, transform: [{ translateY: ca.translateY }] } : undefined,
                ]}
              >
                <Pressable
                  style={styles.videoCard}
                  onPress={() => {
                    if (isLocked) { showLockedAlert(); return; }
                    setSelectedVideo(video);
                  }}
                >
                  <View style={styles.thumbnailWrapper}>
                    <Image
                      source={{ uri: video.thumbnail || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <Key size={13} color="#FFF" />
                      </View>
                    )}
                    <View style={styles.playIconOverlay}>
                      <Play size={20} color="#FFF" fill="#FFF" />
                    </View>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 28, paddingTop: 60, marginBottom: 32 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#F1F1E8' },
  title: { fontSize: 32, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface },
  searchSection: { marginBottom: 32, paddingHorizontal: 28 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: '#F1F1E8' },
  searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Outfit_500Medium', fontSize: 16, color: colors.on_surface },
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
  mealPill: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#F1F1E8' },
  mealPillActive: { backgroundColor: '#A3B3A5', borderColor: '#A3B3A5' },
  mealText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface_variant },
  mealTextActive: { color: '#FFF' },
  videoGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  videoCard: { width: '100%' },
  thumbnailWrapper: { width: '100%', height: 110, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.background },
  thumbnail: { width: '100%', height: '100%', opacity: 0.85 },
  playIconOverlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -10, marginLeft: -10 },
  videoInfo: { marginTop: 12 },
  videoCategory: { fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#A3B3A5', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  videoTitle: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.on_surface, lineHeight: 20 },
  playerContainer: { flex: 1, backgroundColor: colors.background },
  playerScroll: { flex: 1 },
  playerScrollContent: { flexGrow: 1 },
  playerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 20 },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F1F1E8' },
  playerNavTitle: { flex: 1, fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface },
  videoArea: { width: '100%', height: VIDEO_AREA_HEIGHT, position: 'relative' },
  videoMacroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 20, paddingVertical: 12 },
  videoMacroText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  detailsSection: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 8 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  phaseTag: { backgroundColor: '#A3B3A520', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 12 },
  tagText: { color: '#A3B3A5', fontSize: 11, fontFamily: 'Outfit_700Bold', textTransform: 'uppercase' },
  durationDetail: { color: colors.on_surface_variant, fontSize: 13, fontFamily: 'Outfit_600SemiBold', opacity: 0.6 },
  detailTitle: { fontSize: 28, fontFamily: 'InstrumentSerif_400Regular', color: colors.on_surface, marginBottom: 16 },
  detailDesc: { fontSize: 15, fontFamily: 'Outfit_500Medium', color: colors.on_surface_variant, lineHeight: 26 },
  audioView: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  audioThumb: { width: 160, height: 160, borderRadius: 80, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  audioSessionText: { fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },
  lockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBackButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  recipeSection: { marginTop: 24, paddingTop: 0 },
  recipeMacroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  recipeMacroItem: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface_variant },
  recipeMacroDot: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#A3B3A5' },
  recipeSectionTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, color: colors.on_surface, marginBottom: 16 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  ingredientText: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 15, color: colors.on_surface, lineHeight: 22, opacity: 0.85 },
  stepRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  stepNumber: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18, color: '#A3B3A5', width: 20 },
  stepText: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 15, color: colors.on_surface, lineHeight: 24, opacity: 0.85 },
  coachingTipsBox: {
    backgroundColor: '#F4F2EC',
    borderRadius: 24,
    padding: 24,
    marginTop: 32,
  },
});
