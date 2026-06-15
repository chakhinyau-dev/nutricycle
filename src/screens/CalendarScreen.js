import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import {
  addDays,
  subDays,
  format,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, AlertCircle, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react-native';
import { getCycleInsights, getPhaseForDate, isFertileDate, isPeriodDate, normalizeCycleProfile } from '../utils/cycle';

const { width } = Dimensions.get('window');

// Tracker Phase Colors
const TRACKER_COLORS = {
  menstrual: '#D4907A',
  follicular: '#C4B87E',
  ovulation: '#D4A8A8',
  luteal: '#9B8DC4',
};

export const CalendarScreen = ({ onBack, onNavigate, cycleProfile, dailyLogs = [], onDeleteLog }) => {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isSpanish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es');
  const currentLocale = isSpanish ? es : enUS;

  const profile = normalizeCycleProfile(cycleProfile);
  const cycleInfo = useMemo(() => getCycleInsights(profile), [profile]);

  const cycleLength = profile.cycleLength;
  const periodLength = profile.periodLength;
  const cycleDay = cycleInfo.cycleDay;
  const currentPhase = cycleInfo.currentPhaseKey;

  // --- 1. Day of Week Strip (Centered around Selected Date) ---
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start on Monday
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const getLogForDate = (date) => {
    return dailyLogs.find((log) => {
      const logDate = new Date(log.log_date || log.logged_at);
      return isSameDay(logDate, date);
    });
  };

  // --- 2. trigonometry calculation for circular dots ---
  const circleRadius = 110;
  const containerSize = 300;
  const cx = containerSize / 2;
  const cy = containerSize / 2;

  const dots = useMemo(() => {
    const dotsArray = [];
    const fertileStart = cycleInfo.fertileStartDay;
    const fertileEnd = cycleInfo.fertileEndDay;

    for (let i = 0; i < cycleLength; i++) {
      const dayNum = i + 1;
      const angle = (i * 2 * Math.PI) / cycleLength - Math.PI / 2;
      const x = cx + circleRadius * Math.cos(angle);
      const y = cy + circleRadius * Math.sin(angle);

      // Determine phase for this dot
      let phase = 'follicular';
      if (dayNum <= periodLength) {
        phase = 'menstrual';
      } else if (dayNum >= fertileStart && dayNum <= fertileEnd) {
        phase = 'ovulation';
      } else if (dayNum > fertileEnd) {
        phase = 'luteal';
      } else {
        phase = 'follicular';
      }

      dotsArray.push({
        dayNum,
        x,
        y,
        color: TRACKER_COLORS[phase],
        isCurrent: dayNum === cycleDay,
      });
    }
    return dotsArray;
  }, [cycleLength, periodLength, cycleDay, cycleInfo, cx, cy]);

  // --- 3. Days remaining until next phase logic ---
  const nextPhaseInfo = useMemo(() => {
    const fertileStart = cycleInfo.fertileStartDay;
    const fertileEnd = cycleInfo.fertileEndDay;

    let nextPhaseName = '';
    let daysRemaining = 0;

    if (currentPhase === 'menstrual') {
      nextPhaseName = t('phases.follicular');
      daysRemaining = (periodLength + 1) - cycleDay;
    } else if (currentPhase === 'follicular') {
      nextPhaseName = t('phases.ovulation');
      daysRemaining = fertileStart - cycleDay;
    } else if (currentPhase === 'ovulation') {
      nextPhaseName = t('phases.luteal');
      daysRemaining = (fertileEnd + 1) - cycleDay;
    } else {
      nextPhaseName = t('phases.menstrual');
      daysRemaining = (cycleLength + 1) - cycleDay;
    }

    if (daysRemaining <= 0) daysRemaining = 1;

    return {
      name: nextPhaseName,
      days: daysRemaining
    };
  }, [currentPhase, cycleDay, periodLength, cycleLength, cycleInfo, t]);

  // --- 4. HORMONE CURVE MATH FOR SELECT DATE ---
  // Determine cycle day of the selected date
  const selectedCycleDay = useMemo(() => {
    const diff = Math.floor((selectedDate.getTime() - new Date(profile.lastPeriodStart).getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 1;
    return (diff % cycleLength) + 1;
  }, [selectedDate, profile.lastPeriodStart, cycleLength]);

  const chartWidth = width - 56;
  const chartHeight = 90;

  const { estrogenPath, progesteronePath, selectDayX, selectE_Y, selectP_Y } = useMemo(() => {
    let ePoints = [];
    let pPoints = [];
    let curE_Y = chartHeight / 2;
    let curP_Y = chartHeight / 2;
    let curX = 0;

    for (let i = 1; i <= cycleLength; i++) {
      const x = ((i - 1) / (cycleLength - 1)) * chartWidth;
      const t = (i - 1) / (cycleLength - 1);

      const eVal = 0.15 + 0.65 * Math.exp(-Math.pow((t - 0.44) / 0.08, 2)) + 0.3 * Math.exp(-Math.pow((t - 0.76) / 0.12, 2));
      const pVal = 0.05 + 0.7 * Math.exp(-Math.pow((t - 0.76) / 0.12, 2));

      const yE = chartHeight - 12 - eVal * (chartHeight - 24);
      const yP = chartHeight - 12 - pVal * (chartHeight - 24);

      ePoints.push(`${x},${yE}`);
      pPoints.push(`${x},${yP}`);

      if (i === selectedCycleDay) {
        curX = x;
        curE_Y = yE;
        curP_Y = yP;
      }
    }

    return {
      estrogenPath: `M ${ePoints.join(' L ')}`,
      progesteronePath: `M ${pPoints.join(' L ')}`,
      selectDayX: curX,
      selectE_Y: curE_Y,
      selectP_Y: curP_Y
    };
  }, [cycleLength, selectedCycleDay, chartWidth, chartHeight]);

  const selectedDayLog = getLogForDate(selectedDate);
  const selectedDayPhase = getPhaseForDate(profile, selectedDate);
  
  const formattedSelectedDate = format(selectedDate, 'MMMM d, yyyy', { locale: currentLocale });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.title}>Tu Ciclo</Text>
      </View>

      {/* Circular Tracker Container */}
      <View style={styles.trackerContainer}>
        <View style={[styles.circleLayout, { width: containerSize, height: containerSize }]}>
          {/* Render circular dots */}
          {dots.map(dot => (
            <View
              key={dot.dayNum}
              style={[
                styles.dotWrapper,
                {
                  left: dot.x - (dot.isCurrent ? 9 : 6),
                  top: dot.y - (dot.isCurrent ? 9 : 6),
                }
              ]}
            >
              <View
                style={[
                  styles.circleDot,
                  {
                    backgroundColor: dot.color,
                    width: dot.isCurrent ? 18 : 12,
                    height: dot.isCurrent ? 18 : 12,
                    borderRadius: dot.isCurrent ? 9 : 6,
                  },
                  dot.isCurrent && styles.activeDotOutline
                ]}
              />
            </View>
          ))}

          {/* Center text of circular tracker */}
          <View style={styles.centerTextContainer}>
            <Text style={styles.centerDayNum}>{cycleDay}</Text>
            <Text style={styles.centerPhaseName}>{t(`phases.${currentPhase}`)}</Text>
            <Text style={styles.centerCountdown}>
              {nextPhaseInfo.days === 1
                ? t('calendar.countdown_one_day', { phase: nextPhaseInfo.name, defaultValue: `Falta 1 día para ${nextPhaseInfo.name}` })
                : t('calendar.countdown_days', { days: nextPhaseInfo.days, phase: nextPhaseInfo.name, defaultValue: `Faltan ${nextPhaseInfo.days} días para ${nextPhaseInfo.name}` })}
            </Text>
          </View>
        </View>

        {/* Log Period CTA */}
        <Pressable
          style={styles.logBtn}
          onPress={() => {
            if (typeof onNavigate === 'function') onNavigate('dailyLog');
          }}
        >
          <Plus size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.logBtnText}>{t('calendar.log_btn', { defaultValue: 'Registrar Período / Síntomas' })}</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 36 }} />

      {/* Horizontal Day-of-week Selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>{t('calendar.navigate_days')}</Text>
        
        <View style={styles.daysStrip}>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const hasLog = !!getLogForDate(day);
            const isPeriod = isPeriodDate(profile, day);
            const isFertile = isFertileDate(profile, day);

            // Determine indicator dot color
            let statusColor = 'transparent';
            if (isPeriod) statusColor = TRACKER_COLORS.menstrual;
            else if (isFertile) statusColor = TRACKER_COLORS.ovulation;

            return (
              <Pressable
                key={day.toString()}
                style={[
                  styles.stripDayButton,
                  isSelected && styles.stripDayButtonActive,
                  isToday && !isSelected && styles.stripDayButtonToday
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.stripDayLabel,
                  isSelected && styles.stripTextActive,
                  isToday && !isSelected && { color: colors.primary }
                ]}>
                  {format(day, 'E', { locale: currentLocale }).substring(0, 1).toUpperCase()}
                </Text>
                
                <Text style={[
                  styles.stripDayNumber,
                  isSelected && styles.stripTextActive,
                  isToday && !isSelected && { color: colors.primary, fontWeight: '700' }
                ]}>
                  {format(day, 'd')}
                </Text>

                {/* Log indicators */}
                <View style={styles.indicatorContainer}>
                  {hasLog && <View style={[styles.logIndicatorDot, isSelected && { backgroundColor: '#FFF' }]} />}
                  {statusColor !== 'transparent' && (
                    <View style={[styles.statusIndicatorDot, { backgroundColor: isSelected ? '#FFF' : statusColor }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 28 }} />

      {/* Selected Day details and logs */}
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{formattedSelectedDate}</Text>
          <Text style={styles.detailCycleDay}>{t('calendar.cycle_day_label', { day: selectedCycleDay, defaultValue: `Día del ciclo ${selectedCycleDay}` })}</Text>
        </View>

        <View style={styles.phaseBadgeContainer}>
          <View style={[styles.phaseColorPill, { backgroundColor: TRACKER_COLORS[selectedDayPhase || 'follicular'] }]}>
            <Text style={styles.phasePillText}>{t(`phases.${selectedDayPhase || 'follicular'}`)}</Text>
          </View>
        </View>

        <Text style={styles.phaseAdvice}>
          {selectedDayPhase === 'menstrual' 
            ? t('calendar.phase_menstrual_card') 
            : t(`phases_data.${selectedDayPhase || 'follicular'}.advice`)}
        </Text>

        {selectedDayLog ? (
          <View style={styles.logDetailsBox}>
            <View style={styles.logHeaderRow}>
              <Text style={styles.logMoodTitle}>
                {t('calendar.mood_label')} <Text style={styles.logMoodVal}>{t(`dailylog.moods.${selectedDayLog.mood}`)}</Text>
              </Text>
              <Pressable 
                onPress={() => {
                  Alert.alert(
                    t('calendar.delete_log_title'),
                    t('calendar.delete_log_confirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: () => onDeleteLog(selectedDayLog.id, selectedDayLog.log_date) }
                    ]
                  );
                }}
                hitSlop={10}
              >
                <Trash2 size={16} color="#EB5757" />
              </Pressable>
            </View>

            {selectedDayLog.symptoms && selectedDayLog.symptoms.length > 0 && (
              <View style={styles.symptomsGrid}>
                {selectedDayLog.symptoms.map(s => (
                  <View key={s} style={styles.symptomPill}>
                    <Text style={styles.symptomPillText}>{t(`dailylog.symptoms.${s}`)}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDayLog.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{`"${selectedDayLog.notes}"`}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyLogCard}>
            <AlertCircle size={20} color={colors.on_surface_variant} opacity={0.5} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyLogText}>{t('calendar.empty_state')}</Text>
          </View>
        )}
      </View>

      <View style={{ marginBottom: 28 }} />

      {/* Hormone Tides SVG Chart for selected day context */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('calendar.hormone_curves_day')}</Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.legendLabel}>{t('calendar.estrogen_short')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendLabel}>{t('calendar.progesterone_short')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            <Path d={estrogenPath} fill="none" stroke="#A78BFA" strokeWidth={2.5} />
            <Path d={progesteronePath} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
            <Line x1={selectDayX} y1={5} x2={selectDayX} y2={chartHeight - 5} stroke="#64748B" strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={selectDayX} cy={selectE_Y} r={5} fill="#A78BFA" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={selectDayX} cy={selectP_Y} r={5} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.5} />
          </Svg>
        </View>
      </View>

      <View style={{ height: 160 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F2',
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
  },
  trackerContainer: {
    alignItems: 'center',
  },
  circleLayout: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dotWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  activeDotOutline: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  centerTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 160,
  },
  centerDayNum: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 72,
    color: '#B5705A',
    lineHeight: 76,
    marginBottom: 2,
  },
  centerPhaseName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.on_surface,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  centerCountdown: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.on_surface_variant,
    textAlign: 'center',
    opacity: 0.7,
  },
  logBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  logBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  selectorTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stripDayButton: {
    width: (width - 104) / 7,
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  stripDayButtonActive: {
    backgroundColor: colors.primary, // Sage Green (#A3B3A5)
    borderColor: colors.primary,
  },
  stripDayButtonToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stripDayLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    opacity: 0.6,
    marginBottom: 4,
  },
  stripDayNumber: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
  },
  stripTextActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    bottom: 4,
  },
  logIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  statusIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailDate: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
  },
  detailCycleDay: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  phaseBadgeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  phaseColorPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phasePillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  phaseAdvice: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface,
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 20,
  },
  logDetailsBox: {
    borderTopWidth: 1,
    borderTopColor: '#F1F1E8',
    paddingTop: 18,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logMoodTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logMoodVal: {
    color: colors.primary,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  symptomPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  symptomPillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface,
  },
  notesBox: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  notesText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyLogCard: {
    alignItems: 'center',
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  emptyLogText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.6,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 9,
    color: colors.on_surface_variant,
  },
  chartWrapper: {
    alignItems: 'center',
  }
});
