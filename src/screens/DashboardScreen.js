import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Utensils, Apple, Calendar, Heart, ShieldAlert, Play } from 'lucide-react-native';
import { colors } from '../theme/colors';

import morningImg from '../../assets/greeting_morning.png';
import afternoonImg from '../../assets/greeting_afternoon.png';
import nightImg from '../../assets/greeting_night.png';

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

  // Get localized goal name
  const getGoalLabel = () => {
    return t(`wizard.goals.${userGoal}`, { defaultValue: 'Equilibrio hormonal' });
  };

  const getTimeBasedGreeting = () => {
    const hours = new Date().getHours();
    const name = user?.firstName || t('common.user_fallback', { defaultValue: 'bonita' });
    if (hours >= 5 && hours < 12) return t('dashboard.greeting_morning', { name });
    if (hours >= 12 && hours < 19) return t('dashboard.greeting_afternoon', { name });
    return t('dashboard.greeting_evening', { name });
  };

  const getTimeBasedImage = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return morningImg;
    if (hours >= 12 && hours < 19) return afternoonImg;
    return nightImg;
  };

  const PHASE_CONTENT = {
    menstrual: {
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
      title: t('dashboard.phase_titles.menstrual'),
      msg: t('phase_menstrual_msg'),
    },
    follicular: {
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      title: t('dashboard.phase_titles.follicular'),
      msg: t('phase_follicular_msg'),
    },
    ovulation: {
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800',
      title: t('dashboard.phase_titles.ovulation'),
      msg: t('phase_ovulation_msg'),
    },
    luteal: {
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      title: t('dashboard.phase_titles.luteal'),
      msg: t('phase_luteal_msg'),
    },
  };

  const currentContent = PHASE_CONTENT[phaseKey] || PHASE_CONTENT.follicular;

  // --- SVG HORMONE CHART MATHEMATICS ---
  const cycleLength = cycleProfile?.cycleLength || 28;
  const cycleDay = cycleInfo?.cycleDay || 1;
  const chartWidth = width - 48; // Full width minus container padding
  const chartHeight = 110;

  const { estrogenPath, progesteronePath, currentDayX, curEstrogenY, curProgesteroneY } = useMemo(() => {
    let ePoints = [];
    let pPoints = [];
    let curE_Y = chartHeight / 2;
    let curP_Y = chartHeight / 2;
    let curX = 0;

    for (let i = 1; i <= cycleLength; i++) {
      const x = ((i - 1) / (cycleLength - 1)) * chartWidth;
      const t = (i - 1) / (cycleLength - 1);

      // Estrogen curve approximation (peaks at ovulation day 13-14, with secondary peak in luteal phase)
      const eVal = 0.15 + 0.65 * Math.exp(-Math.pow((t - 0.44) / 0.08, 2)) + 0.3 * Math.exp(-Math.pow((t - 0.76) / 0.12, 2));
      // Progesterone curve approximation (flat until ovulation, peaks in mid-luteal phase around 21-22)
      const pVal = 0.05 + 0.7 * Math.exp(-Math.pow((t - 0.76) / 0.12, 2));

      // Map values to SVG Y coordinates (remember: Y starts at 0 at the top)
      const yE = chartHeight - 15 - eVal * (chartHeight - 30);
      const yP = chartHeight - 15 - pVal * (chartHeight - 30);

      ePoints.push(`${x},${yE}`);
      pPoints.push(`${x},${yP}`);

      if (i === cycleDay) {
        curX = x;
        curE_Y = yE;
        curP_Y = yP;
      }
    }

    return {
      estrogenPath: `M ${ePoints.join(' L ')}`,
      progesteronePath: `M ${pPoints.join(' L ')}`,
      currentDayX: curX,
      curEstrogenY: curE_Y,
      curProgesteroneY: curP_Y
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
          <View style={styles.goalBadge}>
            <Heart size={12} color={colors.secondary} fill={colors.secondary} />
            <Text style={styles.goalText}>{getGoalLabel()}</Text>
          </View>
        </View>
        <Pressable onPress={() => onNavigate('settings')}>
           <Image source={{ uri: user?.imageUrl || fallbackAvatar }} style={styles.avatar} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 28 }} />

      {/* 2. Main Emotional Card */}
      <View style={styles.mainCard}>
        <Image source={getTimeBasedImage()} style={styles.mainCardImage} resizeMode="cover" />
        <View style={styles.mainCardOverlay}>
          <Text style={styles.mainCardPhase}>{currentContent.title}</Text>
          <Text style={styles.mainCardMessage}>{currentContent.msg}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 36 }} />

      {/* 3. Cycle Info (Horizontal Row) */}
      <View style={styles.cycleInfoSection}>
        <View>
          <Text style={styles.cycleInfoText}>
            {t('dashboard.cycle_day', { day: cycleInfo?.cycleDay || 1 })}
          </Text>
          <Text style={styles.cycleInfoTextSecondary}>
            {t('dashboard.next_period', { days: cycleInfo?.daysUntilNextPeriod || 28 })}
          </Text>
        </View>
        <Pressable style={styles.logTodayBtn} onPress={() => onNavigate('dailyLog')}>
          <Text style={styles.logTodayText}>{t('dashboard.log_action', { defaultValue: 'Registrar' })}</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 24 }} />

      {/* 4. Hormone curve chart section */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('dashboard.hormone_tides')}</Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.legendLabel}>{t('dashboard.estrogen')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendLabel}>{t('dashboard.progesterone')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Estrogen Curve */}
            <Path
              d={estrogenPath}
              fill="none"
              stroke="#A78BFA"
              strokeWidth={3}
            />
            {/* Progesterone Curve */}
            <Path
              d={progesteronePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={3}
            />

            {/* Current day indicator line */}
            <Line
              x1={currentDayX}
              y1={5}
              x2={currentDayX}
              y2={chartHeight - 5}
              stroke="#64748B"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Intersection dots */}
            <Circle cx={currentDayX} cy={curEstrogenY} r={6} fill="#A78BFA" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={currentDayX} cy={curProgesteroneY} r={6} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.5} />
          </Svg>
        </View>

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>{t('common.day')} 1</Text>
          <Text style={[styles.chartFooterText, { fontWeight: '700', color: colors.on_surface }]}>{t('common.day')} {cycleDay} ({t('dashboard.today_label')})</Text>
          <Text style={styles.chartFooterText}>{t('common.day')} {cycleLength}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 32 }} />

      {/* 5. Quick Access Circles */}
      <View style={styles.quickAccessSection}>
        <Text style={styles.quickAccessTitle}>{t('dashboard.quick_access')}</Text>
        <View style={styles.circlesRow}>
          <Pressable style={styles.circleItem} onPress={() => onNavigate('recipes')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#EBF2EB' }]}>
              <Utensils size={22} color={colors.on_primary_container} />
            </View>
            <Text style={styles.circleLabel}>{t('nav.recipes')}</Text>
          </Pressable>

          <Pressable style={styles.circleItem} onPress={() => onNavigate('videos')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Play size={22} color={colors.secondary} />
            </View>
            <Text style={styles.circleLabel}>{t('nav.videos')}</Text>
          </Pressable>

          <Pressable style={styles.circleItem} onPress={() => onNavigate('keyFoods')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#FEF9EC' }]}>
              <Apple size={22} color="#D97706" />
            </View>
            <Text style={styles.circleLabel}>{t('dashboard.key_foods_title')}</Text>
          </Pressable>

          <Pressable style={styles.circleItem} onPress={() => onNavigate('shoppingList')}>
            <View style={[styles.circleIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Calendar size={22} color="#059669" />
            </View>
            <Text style={styles.circleLabel}>{t('shopping.title')}</Text>
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
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  goalText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.on_surface_variant,
    opacity: 0.8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EFEDE4',
  },
  mainCard: {
    width: '100%',
    height: 280, // Reduced from 440 to fit curve chart cleanly on one page
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  mainCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF9F6',
    opacity: 0.95,
  },
  mainCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(74,68,83,0.3)', // softer overlay
  },
  mainCardPhase: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: '#FFF',
    marginBottom: 8,
  },
  mainCardMessage: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
    opacity: 0.95,
  },
  cycleInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cycleInfoText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 4,
  },
  cycleInfoTextSecondary: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.primary,
  },
  logTodayBtn: {
    backgroundColor: colors.primary, // Sage Green (#A3B3A5)
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  logTodayText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
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
    width: (width - 48) / 4.5,
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
