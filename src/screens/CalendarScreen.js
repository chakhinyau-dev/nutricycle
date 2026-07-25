import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Leaf, Plus, Trash2 } from 'lucide-react-native';
import { getCycleInsights, getPhaseForDate, isFertileDate, isPeriodDate, normalizeCycleProfile } from '../utils/cycle';

const { width } = Dimensions.get('window');

// Tracker Phase Colors
const TRACKER_COLORS = {
  menstrual:  '#F2C4C4',
  follicular: '#B8D8BC',
  ovulation:  '#F9E4B7',
  luteal:     '#C8BCE0',
};

export const CalendarScreen = ({ onBack, onNavigate, cycleProfile, dailyLogs = [], onDeleteLog }) => {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekBaseDate, setWeekBaseDate] = useState(new Date());

  const isSpanish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es');
  const currentLocale = isSpanish ? es : enUS;

  const profile = normalizeCycleProfile(cycleProfile);
  const cycleInfo = useMemo(() => getCycleInsights(profile), [profile]);

  const cycleLength = Number(profile.cycleLength) || 28;
  const periodLength = Number(profile.periodLength) || 5;
  const cycleDay = cycleInfo.cycleDay;
  const currentPhase = cycleInfo.currentPhaseKey;

  // --- 1. Day of Week Strip (Centered around Selected Date) ---
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekBaseDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [weekBaseDate]);

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

  const fertileStart = cycleInfo.fertileStartDay;
  const fertileEnd = cycleInfo.fertileEndDay;

  const dots = useMemo(() => {
    const dotsArray = [];
    for (let i = 0; i < cycleLength; i++) {
      const dayNum = i + 1;
      const angle = (i * 2 * Math.PI) / cycleLength - Math.PI / 2;
      const x = cx + circleRadius * Math.cos(angle);
      const y = cy + circleRadius * Math.sin(angle);

      let phase = 'follicular';
      if (dayNum <= periodLength) phase = 'menstrual';
      else if (dayNum >= fertileStart && dayNum <= fertileEnd) phase = 'ovulation';
      else if (dayNum > fertileEnd) phase = 'luteal';

      dotsArray.push({
        dayNum,
        x,
        y,
        phase,
        color: TRACKER_COLORS[phase],
        isCurrent: dayNum === cycleDay,
      });
    }
    return dotsArray;
  }, [cycleLength, periodLength, cycleDay, fertileStart, fertileEnd, cx, cy]);

  // --- 2b. Phase arc segments for SVG ---
  const phaseArcs = useMemo(() => {
    const GAP = 0.07; // radians gap between phase arcs
    const phases = [
      { key: 'menstrual',  start: 1,               end: periodLength },
      { key: 'follicular', start: periodLength + 1, end: fertileStart - 1 },
      { key: 'ovulation',  start: fertileStart,     end: fertileEnd },
      { key: 'luteal',     start: fertileEnd + 1,   end: cycleLength },
    ];
    return phases.filter(p => p.start <= p.end).map(p => {
      const a1 = ((p.start - 1) / cycleLength) * 2 * Math.PI - Math.PI / 2 + GAP;
      const a2 = (p.end / cycleLength) * 2 * Math.PI - Math.PI / 2 - GAP;
      const x1 = (cx + circleRadius * Math.cos(a1)).toFixed(2);
      const y1 = (cy + circleRadius * Math.sin(a1)).toFixed(2);
      const x2 = (cx + circleRadius * Math.cos(a2)).toFixed(2);
      const y2 = (cy + circleRadius * Math.sin(a2)).toFixed(2);
      const large = (a2 - a1) > Math.PI ? 1 : 0;
      return {
        key: p.key,
        color: TRACKER_COLORS[p.key],
        d: `M ${x1},${y1} A ${circleRadius},${circleRadius} 0 ${large},1 ${x2},${y2}`,
      };
    });
  }, [cycleLength, periodLength, fertileStart, fertileEnd, cx, cy, circleRadius]);

  const handleDotPress = (dayNum) => {
    const date = addDays(new Date(profile.lastPeriodStart), dayNum - 1);
    setSelectedDate(date);
  };

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

  const chartWidth = width - 64;
  const chartHeight = 110;
  const CHART_PAD = 6;

  const { estrogenPath, progesteronePath, testosteronePath, eFilledPath, pFilledPath, tFilledPath, selectDayX, selectE_Y, selectP_Y, selectT_Y } = useMemo(() => {
    const pts_e = [], pts_p = [], pts_t = [];
    let curE_Y = chartHeight / 2, curP_Y = chartHeight / 2, curT_Y = chartHeight / 2, curX = 0;
    const baseY = chartHeight - 8;

    for (let i = 1; i <= cycleLength; i++) {
      const x = CHART_PAD + ((i - 1) / (cycleLength - 1)) * (chartWidth - 2 * CHART_PAD);
      const ratio = (i - 1) / (cycleLength - 1);
      const eVal = 0.15 + 0.65 * Math.exp(-Math.pow((ratio - 0.44) / 0.08, 2)) + 0.3 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const pVal = 0.05 + 0.7 * Math.exp(-Math.pow((ratio - 0.76) / 0.12, 2));
      const tVal = 0.1 + 0.55 * Math.exp(-Math.pow((ratio - 0.42) / 0.13, 2));
      const yE = chartHeight - 15 - eVal * (chartHeight - 30);
      const yP = chartHeight - 15 - pVal * (chartHeight - 30);
      const yT = chartHeight - 15 - tVal * (chartHeight - 30);
      pts_e.push([x, yE]); pts_p.push([x, yP]); pts_t.push([x, yT]);
      if (i === selectedCycleDay) { curX = x; curE_Y = yE; curP_Y = yP; curT_Y = yT; }
    }

    const smooth = (pts) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = ((pts[i][0] + pts[i+1][0]) / 2).toFixed(1);
        const my = ((pts[i][1] + pts[i+1][1]) / 2).toFixed(1);
        d += ` Q ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx},${my}`;
      }
      d += ` L ${pts[pts.length-1][0].toFixed(1)},${pts[pts.length-1][1].toFixed(1)}`;
      return d;
    };
    const filled = (pts, stroke) =>
      `${stroke} L ${pts[pts.length-1][0].toFixed(1)},${baseY} L ${pts[0][0].toFixed(1)},${baseY} Z`;

    const eP = smooth(pts_e), pP = smooth(pts_p), tP = smooth(pts_t);
    return {
      estrogenPath: eP, progesteronePath: pP, testosteronePath: tP,
      eFilledPath: filled(pts_e, eP), pFilledPath: filled(pts_p, pP), tFilledPath: filled(pts_t, tP),
      selectDayX: curX, selectE_Y: curE_Y, selectP_Y: curP_Y, selectT_Y: curT_Y,
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
        <Text style={styles.title}>{t('calendar.cycle_title')}</Text>
      </View>

      {/* Circular Tracker Container */}
      <View style={styles.trackerContainer}>
        <View style={[styles.circleLayout, { width: containerSize, height: containerSize }]}>
          {/* SVG: base ring + phase arc fills */}
          <Svg
            width={containerSize}
            height={containerSize}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {/* Gray base ring */}
            <Circle cx={cx} cy={cy} r={circleRadius} fill="none" stroke="#E8E4DC" strokeWidth={8} />
            {/* Colored phase arcs */}
            {phaseArcs.map(arc => (
              <Path
                key={arc.key}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.45}
              />
            ))}
          </Svg>

          {/* Tappable circular dots */}
          {dots.map(dot => {
            const isSelected = dot.dayNum === selectedCycleDay;
            const dotSize = dot.isCurrent ? 18 : isSelected ? 15 : 10;
            const halfSize = dotSize / 2;
            return (
              <Pressable
                key={dot.dayNum}
                style={[styles.dotWrapper, { left: dot.x - halfSize, top: dot.y - halfSize }]}
                onPress={() => handleDotPress(dot.dayNum)}
                hitSlop={4}
              >
                <View
                  style={[
                    styles.circleDot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: halfSize,
                      backgroundColor: dot.isCurrent ? dot.color : isSelected ? '#FFFFFF' : dot.color,
                    },
                    dot.isCurrent && styles.activeDotOutline,
                    isSelected && !dot.isCurrent && { borderWidth: 2.5, borderColor: dot.color },
                  ]}
                />
              </Pressable>
            );
          })}

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

        {/* Phase legend */}
        <View style={styles.phaseLegendRow}>
          {Object.entries(TRACKER_COLORS).map(([key, color]) => (
            <View key={key} style={styles.phaseLegendItem}>
              <View style={[styles.phaseLegendDot, { backgroundColor: color }]} />
              <Text style={styles.phaseLegendLabel}>{t(`phases.${key}`)}</Text>
            </View>
          ))}
        </View>

        {/* Log Period CTA */}
        <Pressable
          style={styles.logBtn}
          onPress={() => {
            if (typeof onNavigate === 'function') onNavigate('periodCalculator');
          }}
        >
          <Plus size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.logBtnText}>{t('calendar.log_btn', { defaultValue: '+ Registrar período' })}</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 36 }} />

      {/* Horizontal Day-of-week Selector */}
      <View style={styles.selectorCard}>
        {/* Month header + week navigation */}
        <View style={styles.selectorHeader}>
          <Text style={styles.selectorMonth}>
            {format(weekDays[0], 'MMMM yyyy', { locale: currentLocale }).replace(/^\w/, c => c.toUpperCase())}
          </Text>
          <View style={styles.weekNavRow}>
            <Pressable style={styles.weekNavBtn} onPress={() => setWeekBaseDate(d => addDays(d, -7))}>
              <ChevronLeft size={16} color={colors.on_surface_variant} />
            </Pressable>
            <Pressable style={styles.weekNavBtn} onPress={() => setWeekBaseDate(d => addDays(d, 7))}>
              <ChevronRight size={16} color={colors.on_surface_variant} />
            </Pressable>
          </View>
        </View>

        <View style={styles.daysStrip}>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const hasLog = !!getLogForDate(day);
            const isPeriod = isPeriodDate(profile, day);
            const isFertile = isFertileDate(profile, day);
            const dayPhase = isPeriod ? 'menstrual' : isFertile ? 'ovulation' : null;

            return (
              <Pressable
                key={day.toString()}
                style={[
                  styles.stripDayButton,
                  isSelected && styles.stripDayButtonActive,
                  isToday && !isSelected && styles.stripDayButtonToday,
                ]}
                onPress={() => { setSelectedDate(day); setWeekBaseDate(day); }}
              >
                {dayPhase && !isSelected && (
                  <View style={[styles.stripPhaseBar, { backgroundColor: TRACKER_COLORS[dayPhase] }]} />
                )}
                <Text style={[styles.stripDayLabel, isSelected && styles.stripTextActive, isToday && !isSelected && { color: colors.primary }]}>
                  {format(day, 'E', { locale: currentLocale }).substring(0, 1).toUpperCase()}
                </Text>
                <Text style={[styles.stripDayNumber, isSelected && styles.stripTextActive, isToday && !isSelected && { color: colors.primary }]}>
                  {format(day, 'd')}
                </Text>
                <View style={styles.indicatorContainer}>
                  {hasLog && <View style={[styles.logIndicatorDot, isSelected && { backgroundColor: '#FFF' }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 20 }} />

      {/* Selected Day detail card */}
      <View style={styles.detailCard}>
        {/* Header: date + cycle day badge */}
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{formattedSelectedDate}</Text>
          <View style={styles.cycleDayBadge}>
            <Text style={styles.cycleDayBadgeText}>
              {t('calendar.cycle_day_label', { day: selectedCycleDay, defaultValue: `Day ${selectedCycleDay}` })}
            </Text>
          </View>
        </View>

        {/* Phase badge */}
        <View style={styles.phaseBadgeContainer}>
          <View style={[styles.phaseColorPill, { backgroundColor: TRACKER_COLORS[selectedDayPhase || 'follicular'] + '22' }]}>
            <View style={[styles.phasePillDot, { backgroundColor: TRACKER_COLORS[selectedDayPhase || 'follicular'] }]} />
            <Text style={[styles.phasePillText, { color: TRACKER_COLORS[selectedDayPhase || 'follicular'] }]}>
              {t(`phases.${selectedDayPhase || 'follicular'}`).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Advice with colored left border */}
        <View style={[styles.adviceBox, { borderLeftColor: TRACKER_COLORS[selectedDayPhase || 'follicular'] }]}>
          <Text style={styles.phaseAdvice}>
            {selectedDayPhase === 'menstrual'
              ? t('calendar.phase_menstrual_card')
              : t(`phases_data.${selectedDayPhase || 'follicular'}.advice`)}
          </Text>
        </View>

        {selectedDayLog ? (
          <View style={styles.logDetailsBox}>
            <View style={styles.logHeaderRow}>
              <Text style={styles.logMoodTitle}>
                {t('calendar.mood_label')} <Text style={styles.logMoodVal}>{t(`dailylog.moods.${selectedDayLog.mood}`)}</Text>
              </Text>
              <Pressable
                onPress={() => Alert.alert(
                  t('calendar.delete_log_title'),
                  t('calendar.delete_log_confirm'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.delete'), style: 'destructive', onPress: () => onDeleteLog(selectedDayLog.id, selectedDayLog.log_date) }
                  ]
                )}
                hitSlop={10}
              >
                <Trash2 size={16} color="#EB5757" />
              </Pressable>
            </View>
            {selectedDayLog.symptoms?.length > 0 && (
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
          <Pressable style={styles.emptyLogCard} onPress={() => onNavigate?.('dailyLog')}>
            <Leaf size={18} color={colors.primary} opacity={0.5} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyLogText}>{t('calendar.empty_state')}</Text>
            <View style={styles.logTodayBtn}>
              <Text style={styles.logTodayBtnText}>{t('calendar.log_today_cta', { defaultValue: '+ Registrar hoy' })}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={{ marginBottom: 28 }} />

      {/* Hormone Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {t('calendar.hormone_tides_prefix')}
            <Text style={{ color: '#968DA1' }}>{t('calendar.hormone_tides_accent')}</Text>
          </Text>
        </View>

        <View style={styles.chartWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Filled areas */}
            <Path d={tFilledPath} fill="#C9A84C" opacity={0.10} />
            <Path d={pFilledPath} fill="#968DA1" opacity={0.12} />
            <Path d={eFilledPath} fill="#A3B3A5" opacity={0.14} />
            {/* Stroke curves */}
            <Path d={testosteronePath} fill="none" stroke="#C9A84C" strokeWidth={1.5} />
            <Path d={progesteronePath} fill="none" stroke="#968DA1" strokeWidth={2} />
            <Path d={estrogenPath}     fill="none" stroke="#A3B3A5" strokeWidth={2} />
            {/* Selected day marker */}
            <Line x1={selectDayX} y1={22} x2={selectDayX} y2={chartHeight - 8} stroke="#968DA1" strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={selectDayX} cy={selectE_Y} r={4} fill="#A3B3A5" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={selectDayX} cy={selectP_Y} r={4} fill="#968DA1" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx={selectDayX} cy={selectT_Y} r={4} fill="#C9A84C" stroke="#FFFFFF" strokeWidth={1.5} />
            {/* Day badge above cursor */}
            {(() => {
              const label = `${t('common.day')} ${selectedCycleDay}`;
              const badgeW = label.length * 6.5 + 16;
              const badgeH = 20;
              const badgeX = Math.max(0, Math.min(selectDayX - badgeW / 2, chartWidth - badgeW));
              return (
                <>
                  <Rect x={badgeX} y={2} width={badgeW} height={badgeH} rx={6} ry={6} fill="#4A4453" />
                  <SvgText
                    x={badgeX + badgeW / 2}
                    y={15}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={10}
                    fontWeight="700"
                  >
                    {label}
                  </SvgText>
                </>
              );
            })()}
          </Svg>
        </View>

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>{t('common.day')} 1</Text>
          <Text style={styles.chartFooterText}>{t('common.day')} {cycleLength}</Text>
        </View>

        <View style={styles.legendContainer}>
          {[['#A3B3A5', 'dashboard.estrogen'], ['#968DA1', 'dashboard.progesterone'], ['#C9A84C', 'dashboard.testosterone']].map(([c, key]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c }]} />
              <Text style={styles.legendLabel}>{t(key)}</Text>
            </View>
          ))}
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
  phaseLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 4,
    marginBottom: 18,
  },
  phaseLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseLegendLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.75,
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
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorMonth: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
    letterSpacing: 0.2,
  },
  weekNavRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5EF',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  stripDayButton: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    overflow: 'hidden',
  },
  stripPhaseBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  stripDayButtonActive: {
    backgroundColor: colors.primary,
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
    opacity: 0.55,
    marginBottom: 3,
  },
  stripDayNumber: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.on_surface,
  },
  stripTextActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 5,
  },
  logIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.secondary,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailDate: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    flex: 1,
  },
  cycleDayBadge: {
    backgroundColor: '#F5F5EF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginLeft: 8,
    marginTop: 2,
  },
  cycleDayBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 0.3,
  },
  phaseBadgeContainer: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  phaseColorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 7,
  },
  phasePillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  phasePillText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  adviceBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 18,
  },
  phaseAdvice: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface,
    lineHeight: 22,
    opacity: 0.85,
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
    marginBottom: 12,
  },
  logTodayBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  logTodayBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  chartCard: {
    paddingVertical: 4,
    paddingHorizontal: 4,
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
    alignItems: 'flex-start',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartFooterText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },
});
