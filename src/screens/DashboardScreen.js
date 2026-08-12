import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image, Dimensions, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, ClipPath, Rect, G } from 'react-native-svg';

const AnimatedRect    = Animated.createAnimatedComponent(Rect);
const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedLine    = Animated.createAnimatedComponent(Line);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
import { Play, Heart, ChevronRight, Crown, CircleDot, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FOODS_BY_PHASE } from '../utils/foodsData';

const HORMONE_TAG_COLORS = {
  estrogen:         { bg: '#FAEEF0', text: '#C97577', dot: '#E8A0A2' },
  progesterone:     { bg: '#EDF7EE', text: '#5A9A60', dot: '#94C49A' },
  antiinflammatory: { bg: '#FEF0EA', text: '#C96B44', dot: '#E8845A' },
  energy:           { bg: '#FDF5E4', text: '#B8882A', dot: '#D4A853' },
};

const CATEGORY_COLORS = {
  proteins:   '#E8A0A2',
  fats:       '#D4A853',
  carbs:      '#B0A0D4',
  veg_fruits: '#94C49A',
};


const { width } = Dimensions.get('window');
const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';

export const DashboardScreen = ({
  onNavigate,
  user,
  currentPhaseKey = 'follicular',
  cycleInfo,
  cycleProfile,
  videos = [],
  isPremium = false,
}) => {
  const { t } = useTranslation();
  const phaseKey = currentPhaseKey || 'follicular';

  const getTimeBasedGreeting = () => {
    const hours = new Date().getHours();
    const name = user?.firstName || t('common.user_fallback', { defaultValue: 'bonita' });
    if (hours >= 5 && hours < 12) return t('dashboard.greeting_morning', { name });
    if (hours >= 12 && hours < 19) return t('dashboard.greeting_afternoon', { name });
    return t('dashboard.greeting_evening', { name });
  };

  // --- SVG HORMONE CHART MATHEMATICS ---
  const cycleLength = cycleProfile?.cycleLength || 28;
  const cycleDay = cycleInfo?.cycleDay || 1;
  const daysUntilPeriod = cycleInfo?.daysUntilNextPeriod || 0;
  const chartWidth = width - 48;
  const chartHeight = 200;
  const CHART_SIDE_PAD = 18;
  const CHART_TOP_PAD = 36;
  const CHART_BOTTOM_PAD = 28;
  const baselineY = chartHeight - CHART_BOTTOM_PAD;

  const { estrogenPath, progesteronePath, testosteronePath, estrogenFilledPath, progesteroneFilledPath, testosteroneFilledPath, currentDayX } = useMemo(() => {
    const pts_e = [];
    const pts_p = [];
    const pts_t = [];
    let curX = 0;
    const plotHeight = baselineY - CHART_TOP_PAD;

    for (let i = 1; i <= cycleLength; i++) {
      const x = CHART_SIDE_PAD + ((i - 1) / (cycleLength - 1)) * (chartWidth - 2 * CHART_SIDE_PAD);
      const ratio = (i - 1) / (cycleLength - 1);

      const eVal = 0.15 + 0.65 * Math.exp(-Math.pow((ratio - 0.44) / 0.08, 2)) + 0.3 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const pVal = 0.05 + 0.7 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const tVal = 0.1 + 0.55 * Math.exp(-Math.pow((ratio - 0.42) / 0.13, 2));

      pts_e.push([x, baselineY - eVal * plotHeight]);
      pts_p.push([x, baselineY - pVal * plotHeight]);
      pts_t.push([x, baselineY - tVal * plotHeight]);

      if (i === cycleDay) curX = x;
    }

    const toSmoothPath = (pts) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1);
        const midY = ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1);
        d += ` Q ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${midX},${midY}`;
      }
      d += ` L ${pts[pts.length - 1][0].toFixed(1)},${pts[pts.length - 1][1].toFixed(1)}`;
      return d;
    };

    const toFilledPath = (pts, strokePath) =>
      `${strokePath} L ${pts[pts.length - 1][0].toFixed(1)},${baselineY} L ${pts[0][0].toFixed(1)},${baselineY} Z`;

    const ePath = toSmoothPath(pts_e);
    const pPath = toSmoothPath(pts_p);
    const tPath = toSmoothPath(pts_t);

    return {
      estrogenPath: ePath,
      progesteronePath: pPath,
      testosteronePath: tPath,
      estrogenFilledPath: toFilledPath(pts_e, ePath),
      progesteroneFilledPath: toFilledPath(pts_p, pPath),
      testosteroneFilledPath: toFilledPath(pts_t, tPath),
      currentDayX: curX,
    };
  }, [cycleLength, cycleDay, chartWidth, baselineY, CHART_TOP_PAD]);


  const phaseKeyFoods = useMemo(() => {
    const cats = FOODS_BY_PHASE[phaseKey] || FOODS_BY_PHASE.follicular;
    return cats.flatMap(cat => cat.items.map(item => ({ ...item, categoryKey: cat.categoryKey }))).slice(0, 3);
  }, [phaseKey]);

  const foodScrollRef = useRef(null);
  const [foodScrollIndex, setFoodScrollIndex] = useState(0);

  useEffect(() => {
    setFoodScrollIndex(0);
    foodScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [phaseKey]);

  useEffect(() => {
    if (phaseKeyFoods.length <= 1) return;
    const interval = setInterval(() => {
      setFoodScrollIndex(prev => {
        const next = (prev + 1) % phaseKeyFoods.length;
        foodScrollRef.current?.scrollTo({ x: next * 174, animated: true });
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [phaseKeyFoods.length]);

  const trackerData = useMemo(() => {
    const data = {
      menstrual: { energy: t('tracker.energy.low', { defaultValue: 'Low' }), mood: t('tracker.mood.reflective', { defaultValue: 'Reflective' }), drive: t('tracker.drive.resting', { defaultValue: 'Resting' }) },
      follicular: { energy: t('tracker.energy.rising', { defaultValue: 'Rising' }), mood: t('tracker.mood.optimistic', { defaultValue: 'Optimistic' }), drive: t('tracker.drive.building', { defaultValue: 'Building' }) },
      ovulation: { energy: t('tracker.energy.peak', { defaultValue: 'Peak' }), mood: t('tracker.mood.positive', { defaultValue: 'Positive' }), drive: t('tracker.drive.high', { defaultValue: 'High' }) },
      luteal: { energy: t('tracker.energy.declining', { defaultValue: 'Declining' }), mood: t('tracker.mood.introspective', { defaultValue: 'Introspective' }), drive: t('tracker.drive.winding', { defaultValue: 'Winding Down' }) },
    };
    return data[phaseKey] || data.follicular;
  }, [phaseKey, t]);

  // --- Tracker card entrance ---
  const trackerScale   = useRef(new Animated.Value(0.93)).current;
  const trackerOpacity = useRef(new Animated.Value(0)).current;

  // --- Log button breathing pulse ---
  const logBtnScale = useRef(new Animated.Value(1)).current;

  // --- Meal slot cards stagger from right ---
  const mealCardAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity:    new Animated.Value(0),
      translateX: new Animated.Value(44),
    }))
  ).current;

  useEffect(() => {
    // Tracker card entrance
    Animated.parallel([
      Animated.timing(trackerOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(trackerScale,   { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();

    // Log button continuous breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(logBtnScale, { toValue: 1.035, duration: 1300, useNativeDriver: true }),
        Animated.timing(logBtnScale, { toValue: 1,     duration: 1300, useNativeDriver: true }),
      ])
    ).start();

    // Meal cards stagger slide from right
    Animated.sequence([
      Animated.delay(200),
      Animated.stagger(65, mealCardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(a.translateX, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
    ]).start();
  }, []);

  // --- Chart animations ---
  const clipW      = useRef(new Animated.Value(0)).current;
  const fillsAlpha = useRef(new Animated.Value(0)).current;
  const markerAlpha = useRef(new Animated.Value(0)).current;
  const badgeScale  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    clipW.setValue(0);
    fillsAlpha.setValue(0);
    markerAlpha.setValue(0);
    badgeScale.setValue(0);

    Animated.sequence([
      Animated.parallel([
        // curves draw left → right
        Animated.timing(clipW, { toValue: chartWidth, duration: 1000, useNativeDriver: false }),
        // fills fade in mid-way through draw
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(fillsAlpha, { toValue: 1, duration: 500, useNativeDriver: false }),
        ]),
      ]),
      // day marker + badge pop in after curves finish
      Animated.parallel([
        Animated.timing(markerAlpha, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      ]),
    ]).start();
  }, [phaseKey]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{getTimeBasedGreeting()}</Text>
        </View>
        <Pressable onPress={() => onNavigate('settings')}>
          <Image source={{ uri: user?.imageUrl || fallbackAvatar }} style={styles.avatar} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 20 }} />

      {/* 3. Hormone Tracker Widget */}
      <Animated.View style={[styles.trackerCard, { opacity: trackerOpacity, transform: [{ scale: trackerScale }] }]}>
        <View style={styles.trackerColumns}>
          <View style={styles.trackerColumn}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_energy', { defaultValue: 'Energía' })}</Text>
            <Text style={styles.trackerValue} numberOfLines={1} adjustsFontSizeToFit>{trackerData.energy}</Text>
          </View>
          <View style={[styles.trackerColumn, styles.trackerColumnCenter]}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_mood', { defaultValue: 'Ánimo' })}</Text>
            <Text style={styles.trackerValue} numberOfLines={1} adjustsFontSizeToFit>{trackerData.mood}</Text>
          </View>
          <View style={styles.trackerColumn}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_drive', { defaultValue: 'Impulso' })}</Text>
            <Text style={styles.trackerValue} numberOfLines={1} adjustsFontSizeToFit>{trackerData.drive}</Text>
          </View>
        </View>
        <Pressable style={styles.trackerBtn} onPress={() => onNavigate('calendar')}>
          <Text style={styles.trackerBtnText}>{t('dashboard.view_full_tracker', { defaultValue: 'VIEW FULL TRACKER' })}</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      <View style={{ marginBottom: 24 }} />

      {/* 4. Hormone curve chart section */}
      <View style={styles.cycleDayRow}>
        <Text style={styles.cycleDayTitle}>
          {t('dashboard.cycle_day_prefix', { defaultValue: 'Día del ciclo' })} {cycleDay}
        </Text>
        {daysUntilPeriod > 0 && (
          <Text style={styles.cycleDaySubtitle}>
            {t('dashboard.period_in_days', { days: daysUntilPeriod, defaultValue: `Regla en ${daysUntilPeriod} días` })}
          </Text>
        )}
      </View>

      {/* Legend row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8A0A2' }]} />
          <Text style={styles.legendLabel}>{t('dashboard.estrogen')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#94C49A' }]} />
          <Text style={styles.legendLabel}>{t('dashboard.progesterone')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#B0A0D4' }]} />
          <Text style={styles.legendLabel}>{t('dashboard.testosterone', { defaultValue: 'Testosterone' })}</Text>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <ClipPath id="curveClip">
              <AnimatedRect x={0} y={0} width={clipW} height={chartHeight} />
            </ClipPath>
          </Defs>

          {/* Filled areas — fade in after curves draw */}
          <AnimatedPath d={testosteroneFilledPath} fill="rgba(176,160,212,0.18)" opacity={fillsAlpha} />
          <AnimatedPath d={progesteroneFilledPath} fill="rgba(148,196,154,0.18)" opacity={fillsAlpha} />
          <AnimatedPath d={estrogenFilledPath}     fill="rgba(232,160,162,0.22)" opacity={fillsAlpha} />

          {/* Stroke curves — draw left → right via clip */}
          <G clipPath="url(#curveClip)">
            <Path d={testosteronePath} fill="none" stroke="#B0A0D4" strokeWidth={2} />
            <Path d={progesteronePath} fill="none" stroke="#94C49A" strokeWidth={2} />
            <Path d={estrogenPath}     fill="none" stroke="#E8A0A2" strokeWidth={2.5} />
          </G>

          {/* Current day dashed line — fades in after draw */}
          <AnimatedLine
            x1={currentDayX} y1={CHART_TOP_PAD}
            x2={currentDayX} y2={baselineY}
            stroke="rgba(90,90,180,0.45)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            opacity={markerAlpha}
          />

          {/* Day badge — pops in via scale */}
          <AnimatedCircle
            cx={currentDayX} cy={18} r={14}
            fill="#968DA1"
            opacity={markerAlpha}
            transform={[{ scale: badgeScale }]}
          />
          <SvgText
            x={currentDayX} y={23}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
          >{String(cycleDay)}</SvgText>

          {/* Tick marks */}
          {[0, 7, 14, 21, 28].filter(d => d < cycleLength).map((d) => {
            const tickX = CHART_SIDE_PAD + (d / (cycleLength - 1)) * (chartWidth - 2 * CHART_SIDE_PAD);
            return (
              <Line key={d} x1={tickX} y1={baselineY} x2={tickX} y2={baselineY + 5} stroke="#B0A8C0" strokeWidth={1} />
            );
          })}

          {/* Phase label */}
          <SvgText
            x={chartWidth / 2} y={chartHeight - 7}
            textAnchor="middle"
            fill="#968DA1"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="2"
          >{t(`phases.${phaseKey}`, { defaultValue: phaseKey }).toUpperCase()}</SvgText>
        </Svg>
      </View>

      <View style={{ marginBottom: 32 }} />

      {/* Log how you feel — breathing pulse */}
      <Animated.View style={{ transform: [{ scale: logBtnScale }] }}>
        <Pressable style={styles.logFeelBtn} onPress={() => onNavigate('dailyLog')}>
          <Heart size={18} color={colors.on_primary_container} />
          <Text style={styles.logFeelBtnText}>{t('dashboard.log_feel', { defaultValue: 'Registrar cómo me siento' })}</Text>
        </Pressable>
      </Animated.View>

      <View style={{ marginBottom: 24 }} />

      {/* AI shortcuts row */}
      <View style={styles.aiShortcutRow}>
        <Pressable style={styles.aiShortcutCard} onPress={() => onNavigate('aiChat')}>
          <View style={[styles.aiShortcutIcon, { backgroundColor: '#EEE8FA' }]}>
            <CircleDot size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.aiShortcutLabel}>{t('dashboard.ai_chat_shortcut', { defaultValue: 'NutriCycle AI' })}</Text>
          <ChevronRight size={14} color={colors.on_surface_variant} style={{ opacity: 0.4 }} />
        </Pressable>
        <Pressable style={styles.aiShortcutCard} onPress={() => onNavigate('aiPredictor')}>
          <View style={[styles.aiShortcutIcon, { backgroundColor: '#E8F4EA' }]}>
            <CheckCircle2 size={20} color="#4B8C52" />
          </View>
          <Text style={styles.aiShortcutLabel}>{t('dashboard.ai_predictor_shortcut', { defaultValue: 'Predictor IA' })}</Text>
          <ChevronRight size={14} color={colors.on_surface_variant} style={{ opacity: 0.4 }} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 28 }} />

      {/* 6. Key Foods for Your Phase */}
      <View style={styles.keyFoodsSection}>
        <View style={styles.keyFoodsSectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={2}>{t('dashboard.key_foods_section', { defaultValue: 'Foods for your phase' })}</Text>
          <Pressable onPress={() => onNavigate('keyFoods')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>{t('common.see_all', { defaultValue: 'Ver todo' })}</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          ref={foodScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.keyFoodsScroll}
          scrollEventThrottle={16}
          onScroll={e => {
            const x = e.nativeEvent.contentOffset.x;
            const idx = Math.round(x / 174);
            if (idx !== foodScrollIndex) setFoodScrollIndex(idx);
          }}
        >
          {phaseKeyFoods.map(food => {
            const tagColors = HORMONE_TAG_COLORS[food.hormoneTag] || HORMONE_TAG_COLORS.energy;
            const catColor  = CATEGORY_COLORS[food.categoryKey] || colors.primary;
            return (
              <Pressable key={food.key} style={styles.keyFoodCard} onPress={() => onNavigate('keyFoods')}>
                <View style={[styles.keyFoodAccent, { backgroundColor: catColor }]} />
                <View style={[styles.keyFoodImageWrap, { backgroundColor: catColor + '18' }]}>
                  <Image source={{ uri: food.image }} style={styles.keyFoodImage} resizeMode="cover" />
                </View>
                <View style={styles.keyFoodContent}>
                  <Text style={styles.keyFoodName} numberOfLines={2}>
                    {t(`key_foods.items.${food.key}.name`)}
                  </Text>
                  <View style={[styles.keyFoodTag, { backgroundColor: tagColors.bg }]}>
                    <View style={[styles.keyFoodTagDot, { backgroundColor: tagColors.dot }]} />
                    <Text style={[styles.keyFoodTagText, { color: tagColors.text }]} numberOfLines={1}>
                      {t(`key_foods.hormone_tags.${food.hormoneTag}`)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.foodDots}>
          {phaseKeyFoods.map((_, i) => (
            <View
              key={i}
              style={[styles.foodDot, i === foodScrollIndex && styles.foodDotActive]}
            />
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 36 }} />

      {/* 7. Today's Meals — 4 meal slots (premium gated) */}
      <View style={styles.suggestedSection}>
        <Text style={styles.suggestedTitle}>{t('dashboard.featured_video')}</Text>

        {!isPremium ? (
          <View style={styles.premiumLockContainer}>
            {/* Ghost skeleton cards shown blurred behind the overlay */}
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.mealSlotCard, { marginBottom: 10, opacity: 0.15 }]}>
                <View style={[styles.mealSlotThumb, { backgroundColor: '#968DA1' }]} />
                <View style={styles.mealSlotInfo}>
                  <View style={{ height: 8, width: '40%', backgroundColor: '#C8C4D0', borderRadius: 4, marginBottom: 6 }} />
                  <View style={{ height: 13, width: '72%', backgroundColor: '#C8C4D0', borderRadius: 4, marginBottom: 6 }} />
                  <View style={{ height: 8, width: '28%', backgroundColor: '#C8C4D0', borderRadius: 4 }} />
                </View>
              </View>
            ))}
            <View style={styles.premiumOverlay}>
              <View style={styles.premiumIconCircle}>
                <Crown size={26} color="#FFF" fill="#FFF" />
              </View>
              <Text style={styles.premiumLockTitle}>{t('dashboard.meals_premium_title', { defaultValue: 'Plan de comidas Premium' })}</Text>
              <Text style={styles.premiumLockSub}>{t('dashboard.meals_premium_sub', { defaultValue: 'Accede a tu plan diario personalizado según tu fase hormonal' })}</Text>
              <Pressable style={styles.premiumLockBtn} onPress={() => onNavigate('subscription')}>
                <Text style={styles.premiumLockBtnText}>{t('dashboard.meals_premium_cta', { defaultValue: 'HAZTE PREMIUM' })}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          (() => {
            const d = new Date().getDay();
            const todayIndex = d === 0 ? 6 : d - 1;
            const SLOT_OFFSETS = { breakfast: 0, lunch: 3, snack: 5, dinner: 2 };
            return ['breakfast', 'lunch', 'snack', 'dinner'].map((mealType, i) => {
              const phasePool = videos.filter(v => v.phaseKey === phaseKey && v.mealType === mealType);
              const fallbackPool = videos.filter(v => v.mealType === mealType);
              const pool = phasePool.length ? phasePool : fallbackPool;
              const video = pool.length
                ? pool[(todayIndex + (SLOT_OFFSETS[mealType] || 0)) % pool.length]
                : null;
              const timeLabel = t(`nutrition.meal_times.${mealType}`, { defaultValue: mealType });
              const mealLabel = t(`nutrition.meal_slots.${mealType}`, { defaultValue: mealType }).toUpperCase();
              return (
                <Animated.View key={mealType} style={{ opacity: mealCardAnims[i].opacity, transform: [{ translateX: mealCardAnims[i].translateX }] }}>
                  <Pressable style={styles.mealSlotCard} onPress={() => video ? onNavigate('videoDetail', video) : onNavigate('videos')}>
                    {video?.thumbnail ? (
                      <View style={styles.mealSlotThumb}>
                        <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        <View style={styles.mealSlotPlayOverlay}>
                          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.mealSlotThumb, styles.mealSlotThumbEmpty]}>
                        <Play size={14} color={colors.on_surface_variant} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <View style={styles.mealSlotInfo}>
                      <Text style={styles.mealSlotTime}>{timeLabel}</Text>
                      <Text style={styles.mealSlotName} numberOfLines={2}>
                        {video ? video.title : t('nutrition.empty_meal', { defaultValue: 'Sin video planificado' })}
                      </Text>
                      <Text style={styles.mealSlotType}>{mealLabel}</Text>
                    </View>
                    {video?.duration && (
                      <Text style={styles.mealSlotDuration}>{video.duration}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            });
          })()
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F2', // Cream Background (#F9F9F2)
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
  },
  goalContextText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    marginTop: 4,
    opacity: 0.8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#A3B3A5',
  },
  trackerCard: {
    backgroundColor: '#A3B3A5',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#A3B3A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  trackerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  trackerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  trackerColumnCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trackerLabel: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  trackerValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  trackerBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  trackerBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cycleDayRow: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  cycleDayTitle: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 28,
    color: colors.on_surface,
  },
  cycleDaySubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginTop: 4,
    opacity: 0.7,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.85,
  },
  chartWrapper: {
    marginVertical: 4,
  },
  logFeelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF2EB',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#A3B3A5',
  },
  logFeelBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.on_primary_container,
  },
  keyFoodsSection: {
    paddingHorizontal: 4,
  },
  keyFoodsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  sectionOverline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    opacity: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    lineHeight: 26,
    flex: 1,
    marginRight: 8,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
  seeAllText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  phaseDescText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 18,
  },
  keyFoodsScroll: {
    gap: 14,
    paddingRight: 8,
    paddingBottom: 4,
  },
  foodDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  foodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8D8D0',
  },
  foodDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A3B3A5',
  },
  keyFoodCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  keyFoodAccent: {
    height: 4,
    width: '100%',
  },
  keyFoodImageWrap: {
    width: '100%',
    height: 95,
  },
  keyFoodImage: {
    width: '100%',
    height: '100%',
  },
  keyFoodContent: {
    padding: 12,
  },
  keyFoodName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface,
    lineHeight: 17,
    marginBottom: 9,
  },
  keyFoodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
    alignSelf: 'flex-start',
  },
  keyFoodTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  keyFoodTagText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  suggestedSection: {
    paddingHorizontal: 4,
  },
  suggestedTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
  },
  recipeCardImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#FAF9F6',
    position: 'relative',
  },
  recipeCardPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  recipeCardPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  recipeCardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#FAF9F6',
  },
  recipeCardContent: {
    padding: 20,
  },
  recipeCardTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeBadge: {
    backgroundColor: '#A3B3A5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recipeBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeTime: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.8,
  },
  recipeTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 6,
  },
  recipeMacros: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
  mealSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealSlotThumb: {
    width: 72,
    height: 72,
    backgroundColor: '#A3B3A5',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealSlotThumbEmpty: {
    backgroundColor: '#F1F5F2',
  },
  mealSlotPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealSlotInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  mealSlotTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
  mealSlotName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface,
    lineHeight: 17,
  },
  mealSlotType: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mealSlotDuration: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
    paddingRight: 14,
  },
  premiumLockContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(249,249,242,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 10,
  },
  premiumIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#968DA1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumLockTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.on_surface,
    textAlign: 'center',
  },
  premiumLockSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumLockBtn: {
    backgroundColor: '#968DA1',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 6,
  },
  premiumLockBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 1,
  },
  aiShortcutRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
  },
  aiShortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#4A4453',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiShortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiShortcutLabel: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface,
  },
});
