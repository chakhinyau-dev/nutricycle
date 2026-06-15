import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Utensils, Leaf, Play, Heart, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';


const { width } = Dimensions.get('window');
const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';

export const DashboardScreen = ({
  onNavigate,
  user,
  currentPhaseKey = 'follicular',
  cycleInfo,
  cycleProfile,
  recipes = [],
}) => {
  const { t } = useTranslation();
  const phaseKey = currentPhaseKey || 'follicular';

  // Obtain user's selected onboarding goal
  const userGoal = cycleProfile?.goal || 'balance';

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
  const chartWidth = width - 48; // Full width minus container padding
  const chartHeight = 110;

  const { estrogenPath, progesteronePath, testosteronePath, currentDayX, curEstrogenY, curProgesteroneY, curTestosteroneY } = useMemo(() => {
    let ePoints = [];
    let pPoints = [];
    let tPoints = [];
    let curE_Y = chartHeight / 2;
    let curP_Y = chartHeight / 2;
    let curT_Y = chartHeight / 2;
    let curX = 0;

    for (let i = 1; i <= cycleLength; i++) {
      const x = ((i - 1) / (cycleLength - 1)) * chartWidth;
      const ratio = (i - 1) / (cycleLength - 1);

      const eVal = 0.15 + 0.65 * Math.exp(-Math.pow((ratio - 0.44) / 0.08, 2)) + 0.3 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const pVal = 0.05 + 0.7 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const tVal = 0.1 + 0.55 * Math.exp(-Math.pow((ratio - 0.42) / 0.13, 2));

      const yE = chartHeight - 15 - eVal * (chartHeight - 30);
      const yP = chartHeight - 15 - pVal * (chartHeight - 30);
      const yT = chartHeight - 15 - tVal * (chartHeight - 30);

      ePoints.push(`${x},${yE}`);
      pPoints.push(`${x},${yP}`);
      tPoints.push(`${x},${yT}`);

      if (i === cycleDay) {
        curX = x;
        curE_Y = yE;
        curP_Y = yP;
        curT_Y = yT;
      }
    }

    return {
      estrogenPath: `M ${ePoints.join(' L ')}`,
      progesteronePath: `M ${pPoints.join(' L ')}`,
      testosteronePath: `M ${tPoints.join(' L ')}`,
      currentDayX: curX,
      curEstrogenY: curE_Y,
      curProgesteroneY: curP_Y,
      curTestosteroneY: curT_Y,
    };
  }, [cycleLength, cycleDay, chartWidth, chartHeight]);

  // --- SUGGESTED RECIPE LOGIC ---
  const suggestedRecipe = useMemo(() => {
    if (!recipes || recipes.length === 0) return null;

    // Determine meal time based on current hour
    const hour = new Date().getHours();
    let mealType = 'lunch';
    if (hour >= 5 && hour < 12) mealType = 'breakfast';
    else if (hour >= 12 && hour < 18) mealType = 'lunch';
    else if (hour >= 18 && hour < 22) mealType = 'dinner';
    else mealType = 'snack';

    // Find recipes for this phase and meal time
    let matches = recipes.filter(r => r.phaseKey === phaseKey && r.mealType === mealType);
    
    // Fallback: any recipe of this phase
    if (matches.length === 0) {
      matches = recipes.filter(r => r.phaseKey === phaseKey);
    }
    
    // Fallback 2: any recipe
    if (matches.length === 0) {
      matches = recipes;
    }

    // Sort matching recipes to prioritize user's onboarding goal
    const sorted = [...matches].sort((a, b) => {
      const aGoal = a.goals?.includes(userGoal) ? 1 : 0;
      const bGoal = b.goals?.includes(userGoal) ? 1 : 0;
      return bGoal - aGoal; // Put matching goal recipes first
    });

    return sorted[0];
  }, [recipes, phaseKey, userGoal]);

  const trackerData = useMemo(() => {
    const data = {
      menstrual: { energy: t('tracker.energy.low', { defaultValue: 'Low' }), mood: t('tracker.mood.reflective', { defaultValue: 'Reflective' }), drive: t('tracker.drive.resting', { defaultValue: 'Resting' }) },
      follicular: { energy: t('tracker.energy.rising', { defaultValue: 'Rising' }), mood: t('tracker.mood.optimistic', { defaultValue: 'Optimistic' }), drive: t('tracker.drive.building', { defaultValue: 'Building' }) },
      ovulation: { energy: t('tracker.energy.peak', { defaultValue: 'Peak' }), mood: t('tracker.mood.positive', { defaultValue: 'Positive' }), drive: t('tracker.drive.high', { defaultValue: 'High' }) },
      luteal: { energy: t('tracker.energy.declining', { defaultValue: 'Declining' }), mood: t('tracker.mood.introspective', { defaultValue: 'Introspective' }), drive: t('tracker.drive.winding', { defaultValue: 'Winding Down' }) },
    };
    return data[phaseKey] || data.follicular;
  }, [phaseKey, t]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>{getTimeBasedGreeting()}</Text>
        </View>
        <Pressable onPress={() => onNavigate('settings')}>
           <Image source={{ uri: user?.imageUrl || fallbackAvatar }} style={styles.avatar} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 20 }} />

      {/* 3. Hormone Tracker Widget */}
      <View style={styles.trackerCard}>
        <View style={styles.trackerColumns}>
          <View style={styles.trackerColumn}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_energy', { defaultValue: 'ENERGY' })}</Text>
            <Text style={styles.trackerValue}>{trackerData.energy}</Text>
          </View>
          <View style={[styles.trackerColumn, styles.trackerColumnCenter]}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_mood', { defaultValue: 'MOOD' })}</Text>
            <Text style={styles.trackerValue}>{trackerData.mood}</Text>
          </View>
          <View style={styles.trackerColumn}>
            <Text style={styles.trackerLabel}>{t('dashboard.tracker_drive', { defaultValue: 'DRIVE' })}</Text>
            <Text style={styles.trackerValue}>{trackerData.drive}</Text>
          </View>
        </View>
        <Pressable style={styles.trackerBtn} onPress={() => onNavigate('calendar')}>
          <Text style={styles.trackerBtnText}>{t('dashboard.view_full_tracker', { defaultValue: 'VIEW FULL TRACKER' })}</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={{ marginBottom: 24 }} />

      {/* 4. Hormone curve chart section */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('dashboard.hormone_map', { defaultValue: 'Tu mapa hormonal' })}</Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#C9605A' }]} />
              <Text style={styles.legendLabel}>{t('dashboard.estrogen')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6EA87B' }]} />
              <Text style={styles.legendLabel}>{t('dashboard.progesterone')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D4897E' }]} />
              <Text style={styles.legendLabel}>{t('dashboard.testosterone', { defaultValue: 'Testosterona' })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Estrogen Curve */}
            <Path d={estrogenPath} fill="none" stroke="#C9605A" strokeWidth={1.5} />
            {/* Progesterone Curve */}
            <Path d={progesteronePath} fill="none" stroke="#6EA87B" strokeWidth={1.5} />
            {/* Testosterone Curve */}
            <Path d={testosteronePath} fill="none" stroke="#D4897E" strokeWidth={1.5} />

            {/* Current day indicator line */}
            <Line
              x1={currentDayX} y1={5} x2={currentDayX} y2={chartHeight - 5}
              stroke="#64748B" strokeWidth={1} strokeDasharray="4 4"
            />

            {/* Intersection dots */}
            <Circle cx={currentDayX} cy={curEstrogenY} r={4} fill="#C9605A" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={currentDayX} cy={curProgesteroneY} r={4} fill="#6EA87B" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={currentDayX} cy={curTestosteroneY} r={4} fill="#D4897E" stroke="#FFFFFF" strokeWidth={1.5} />
          </Svg>
        </View>

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>{t('common.day')} 1</Text>
          <Text style={[styles.chartFooterText, { fontWeight: '700', color: colors.on_surface }]}>{t('common.day')} {cycleDay} ({t('dashboard.today_label')})</Text>
          <Text style={styles.chartFooterText}>{t('common.day')} {cycleLength}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 32 }} />

      {/* Log how you feel */}
      <Pressable style={styles.logFeelBtn} onPress={() => onNavigate('dailyLog')}>
        <Heart size={18} color={colors.on_primary_container} />
        <Text style={styles.logFeelBtnText}>{t('dashboard.log_feel', { defaultValue: 'Registrar cómo me siento' })}</Text>
      </Pressable>

      <View style={{ marginBottom: 28 }} />

      {/* 5. Quick Access Circles */}
      <View style={styles.quickAccessSection}>
        <View style={styles.circlesRow}>
          <Pressable style={styles.circleItem} onPress={() => onNavigate('nutrition')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#EBF2EB' }]}>
              <Utensils size={22} color={colors.on_primary_container} />
            </View>
            <Text style={styles.circleLabel}>{t('nav.nutrition')}</Text>
          </Pressable>

          <Pressable style={styles.circleItem} onPress={() => onNavigate('keyFoods')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#FEF9EC' }]}>
              <Leaf size={22} color="#D97706" />
            </View>
            <Text style={styles.circleLabel}>{t('dashboard.key_foods_title')}</Text>
          </Pressable>

          <Pressable style={styles.circleItem} onPress={() => onNavigate('videos')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Play size={22} color="#059669" />
            </View>
            <Text style={styles.circleLabel}>{t('nav.videos')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginBottom: 36 }} />

      {/* 6. Suggested Recipe of the Day */}
      {suggestedRecipe && (
        <View style={styles.suggestedSection}>
          <Text style={styles.suggestedTitle}>{t('dashboard.suggested_recipe')}</Text>
          <Pressable 
            style={styles.recipeCard}
            onPress={() => onNavigate('recipeDetail', suggestedRecipe)}
          >
            <Image source={suggestedRecipe.image} style={styles.recipeCardImage} resizeMode="cover" />
            <View style={styles.recipeCardContent}>
              <View style={styles.recipeCardTags}>
                <View style={styles.recipeBadge}>
                  <Text style={styles.recipeBadgeText}>{t(`phases.${suggestedRecipe.phaseKey}`)}</Text>
                </View>
                <Text style={styles.recipeTime}>{suggestedRecipe.time} min</Text>
              </View>
              <Text style={styles.recipeTitle}>{suggestedRecipe.title}</Text>
              <Text style={styles.recipeMacros}>
                {suggestedRecipe.calories} kcal • {t('recipe_detail.high_protein')}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <View style={{ height: 160 }} />
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EFEDE4',
  },
  trackerCard: {
    backgroundColor: '#433D4F',
    borderRadius: 24,
    padding: 20,
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
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trackerLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  trackerValue: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 18,
    color: '#FFFFFF',
  },
  trackerBtn: {
    backgroundColor: '#A3B3A5',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackerBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  chartCard: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
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
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: colors.on_surface_variant,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  chartFooterText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
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
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  logFeelBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.on_primary_container,
  },
  quickAccessSection: {
    paddingHorizontal: 4,
  },
  quickAccessTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  circleItem: {
    alignItems: 'center',
    width: (width - 48) / 3,
  },
  circleIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  circleLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface,
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
    backgroundColor: '#EBF2EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recipeBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: colors.on_primary_container,
    textTransform: 'uppercase',
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
});
