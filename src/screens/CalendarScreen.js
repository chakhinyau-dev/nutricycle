import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CircleHelp, Trash2 } from 'lucide-react-native';
import { getCycleInsights, getPhaseForDate, isFertileDate, isPeriodDate, normalizeCycleProfile } from '../utils/cycle';

const { width } = Dimensions.get('window');

// Premium Color Palette
const THEME = {
  sage: '#A3B3A5',
  softPurple: '#968DA1',
  text: '#1A1A1A',
  textSecondary: '#64748B',
  bg: '#FAF9F6'
};

export const CalendarScreen = ({ onBack, cycleProfile, dailyLogs = [], onDeleteLog }) => {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isSpanish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es');
  const currentLocale = isSpanish ? es : enUS;
  const todayLabel = isSpanish ? 'HOY' : 'Today';
  
  const profile = normalizeCycleProfile(cycleProfile);
  const cycleInfo = useMemo(() => getCycleInsights(profile), [profile]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  const getLogForDate = (date) => {
    return dailyLogs.find((log) => {
      const logDate = new Date(log.log_date || log.logged_at);
      return isSameDay(logDate, date);
    });
  };

  const renderDay = (day) => {
    const isToday = isSameDay(day, new Date());
    const isSelected = isSameDay(day, selectedDate);
    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
    const isPeriod = isPeriodDate(profile, day);
    const isFertile = isFertileDate(profile, day);
    const hasLog = !!getLogForDate(day);
    
    return (
      <View key={day.toString()} style={styles.dayCell}>
        <Pressable
          onPress={() => setSelectedDate(day)}
          style={[
             styles.dayPill,
             isPeriod && { backgroundColor: THEME.softPurple + '40' },
             isFertile && !isPeriod && { backgroundColor: THEME.sage + '20' },
          ]}
        >
          {isToday ? (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{todayLabel}</Text>
            </View>
          ) : null}
          <View style={[
             styles.selectionRing, 
             isSelected && { backgroundColor: THEME.sage },
             isToday && !isSelected && { borderWidth: 1.5, borderColor: THEME.sage }
          ]}>
            <Text
              style={[
                styles.dayText,
                !isCurrentMonth && styles.otherMonthText,
                isSelected && { color: '#FFF' },
                isToday && !isSelected && { color: THEME.sage }
              ]}
            >
              {format(day, 'd')}
            </Text>
          </View>
          {hasLog && <View style={[styles.logIndicator, isSelected && { backgroundColor: '#FFF' }]} />}
        </Pressable>
      </View>
    );
  };

  const selectedDayLog = getLogForDate(selectedDate);
  const selectedDayPhase = getPhaseForDate(profile, selectedDate);
  
  const formattedSelectedDate = format(selectedDate, 'MMMM d, yyyy', { locale: currentLocale });

  const weekdayLabels = [
    t('calendar.weekdays.sun'),
    t('calendar.weekdays.mon'),
    t('calendar.weekdays.tue'),
    t('calendar.weekdays.wed'),
    t('calendar.weekdays.thu'),
    t('calendar.weekdays.fri'),
    t('calendar.weekdays.sat'),
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={THEME.text} />
          </Pressable>
          <Text style={styles.title}>{format(currentDate, 'MMMM', { locale: currentLocale }).toUpperCase()}</Text>
        </View>
        <View style={styles.navGroup}>
          <Pressable onPress={() => setCurrentDate(addMonths(currentDate, -1))} hitSlop={10}>
            <ChevronLeft size={24} color={THEME.text} />
          </Pressable>
          <Pressable onPress={() => setCurrentDate(addMonths(currentDate, 1))} hitSlop={10} style={{ marginLeft: 20 }}>
            <ChevronRight size={24} color={THEME.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('calendar.day_x_cycle', { day: cycleInfo.cycleDay })}</Text>
          <Text style={styles.statValue}>{t('calendar.next_period')}</Text>
          <Text style={styles.statSub}>{t('calendar.based_on_cycle')}</Text>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.weekDaysRow}>
          {weekdayLabels.map((day, i) => (
            <Text key={i} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>{days.map(renderDay)}</View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.softPurple }]} />
          <Text style={styles.legendLabel}>{t('calendar.menstruation')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.sage }]} />
          <Text style={styles.legendLabel}>{t('calendar.ovulation')}</Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{formattedSelectedDate}</Text>
          <Text style={styles.detailCycleDay}>{t('calendar.day_x_cycle', { day: format(selectedDate, 'd') })}</Text>
        </View>

        <View style={styles.phaseCard}>
           <Text style={styles.phaseTitle}>{t(`phases.${selectedDayPhase}`)}</Text>
           <Text style={styles.phaseDesc}>
             {selectedDayPhase === 'menstrual' ? t('calendar.phase_menstrual_card') : t(`phases_data.${selectedDayPhase}.advice`)}
           </Text>
        </View>

        {selectedDayLog ? (
          <View style={styles.logCard}>
             <Text style={styles.logMood}>{t(`dailylog.moods.${selectedDayLog.mood}`)}</Text>
             <View style={styles.symptomsRow}>
                {selectedDayLog.symptoms.map(s => (
                  <View key={s} style={styles.symptomPill}>
                    <Text style={styles.symptomText}>{t(`dailylog.symptoms.${s}`)}</Text>
                  </View>
                ))}
             </View>
          </View>
        ) : (
          <View style={styles.emptyLog}>
            <Text style={styles.emptyLogText}>{t('calendar.empty_state')}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 160 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: THEME.text,
    letterSpacing: 2,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: THEME.text,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: THEME.sage,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: THEME.textSecondary,
    opacity: 0.6,
  },
  calendarContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 32,
    marginBottom: 20,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: THEME.textSecondary,
    opacity: 0.3,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPill: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayBadge: {
    position: 'absolute',
    top: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: THEME.text,
    zIndex: 2,
  },
  todayBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 7,
    color: '#FFF',
    letterSpacing: 0.6,
  },
  selectionRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: THEME.text,
  },
  otherMonthText: {
    opacity: 0.05,
  },
  logIndicator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.sage,
    position: 'absolute',
    bottom: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailSection: {
    paddingHorizontal: 4,
  },
  detailHeader: {
    marginBottom: 20,
  },
  detailDate: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: THEME.text,
    marginBottom: 4,
  },
  detailCycleDay: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: THEME.textSecondary,
  },
  phaseCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 32,
    marginBottom: 16,
  },
  phaseTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: THEME.text,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  phaseDesc: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 22,
  },
  logCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 32,
  },
  logMood: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: THEME.sage,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomPill: {
    backgroundColor: THEME.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  symptomText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: THEME.textSecondary,
  },
  emptyLog: {
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 32,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: THEME.softPurple,
  },
  emptyLogText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: THEME.textSecondary,
    opacity: 0.6,
  },
});


