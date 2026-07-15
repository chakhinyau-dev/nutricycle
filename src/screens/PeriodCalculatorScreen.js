import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, Droplets, Sun, Check } from 'lucide-react-native';
import { addDays, format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

// ── Stepper ────────────────────────────────────────────────────────────────
const Stepper = ({ value, onDecrement, onIncrement, min = 1, max = 99, unit = '' }) => (
  <View style={styles.stepperRow}>
    <Pressable
      style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
      onPress={onDecrement}
      disabled={value <= min}
    >
      <Text style={styles.stepBtnText}>−</Text>
    </Pressable>
    <View style={styles.stepValueWrap}>
      <Text style={styles.stepValue}>{value}</Text>
      {unit ? <Text style={styles.stepUnit}>{unit}</Text> : null}
    </View>
    <Pressable
      style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
      onPress={onIncrement}
      disabled={value >= max}
    >
      <Text style={styles.stepBtnText}>+</Text>
    </Pressable>
  </View>
);

// ── Calendar Picker Modal ──────────────────────────────────────────────────
const CalendarPicker = ({ visible, selectedDate, onSelect, onClose, locale }) => {
  const { t } = useTranslation();
  const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => t(`shopping.days.${d}.short`));
  const [viewMonth, setViewMonth] = useState(
    selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : new Date()
  );

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDow = (getDay(startOfMonth(viewMonth)) + 6) % 7;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const prevMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const selectDay = (day) => {
    if (!day) return;
    onSelect(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    onClose();
  };

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.calModal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.calHeader}>
            <Pressable onPress={prevMonth} style={styles.calNavBtn}>
              <ChevronLeft size={18} color={colors.on_surface} />
            </Pressable>
            <Text style={styles.calMonthLabel}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </Text>
            <Pressable onPress={nextMonth} style={styles.calNavBtn}>
              <ChevronRight size={18} color={colors.on_surface} />
            </Pressable>
          </View>

          <View style={styles.calDowRow}>
            {DOW.map((d, i) => (
              <Text key={i} style={styles.calDowText}>{d}</Text>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={styles.calRow}>
              {Array.from({ length: 7 }).map((_, ci) => {
                const day = row[ci] ?? null;
                const isSel =
                  day &&
                  selectedDate &&
                  day === selectedDate.getDate() &&
                  viewMonth.getMonth() === selectedDate.getMonth() &&
                  viewMonth.getFullYear() === selectedDate.getFullYear();
                const isToday =
                  day &&
                  new Date().getDate() === day &&
                  viewMonth.getMonth() === new Date().getMonth() &&
                  viewMonth.getFullYear() === new Date().getFullYear();
                return (
                  <Pressable
                    key={ci}
                    style={[
                      styles.calDayCell,
                      isSel && styles.calDayCellSelected,
                      isToday && !isSel && styles.calDayCellToday,
                    ]}
                    onPress={() => selectDay(day)}
                  >
                    {day ? (
                      <Text style={[styles.calDayText, isSel && styles.calDayTextSel, isToday && !isSel && styles.calDayTextToday]}>
                        {day}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Pressable style={styles.calCancelBtn} onPress={onClose}>
            <Text style={styles.calCancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────
export const PeriodCalculatorScreen = ({ onBack, onSave, cycleProfile }) => {
  const { t, i18n } = useTranslation();
  const isSpanish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es');
  const locale = isSpanish ? es : enUS;

  const [lastPeriodDate, setLastPeriodDate] = useState(() => {
    if (cycleProfile?.lastPeriodStart) return new Date(cycleProfile.lastPeriodStart);
    return new Date();
  });
  const [periodDuration, setPeriodDuration] = useState(cycleProfile?.periodLength || 5);
  const [cycleLength, setCycleLength] = useState(cycleProfile?.cycleLength || 28);
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  const { ovulationDate, nextPeriodStart, nextPeriodEnd, ovulationDay } = useMemo(() => {
    const oDay = cycleLength - 14;
    const ovulation = addDays(lastPeriodDate, oDay);
    const periodStart = addDays(lastPeriodDate, cycleLength);
    const periodEnd = addDays(periodStart, periodDuration - 1);
    return { ovulationDate: ovulation, nextPeriodStart: periodStart, nextPeriodEnd: periodEnd, ovulationDay: oDay };
  }, [lastPeriodDate, cycleLength, periodDuration]);

  // Phase timeline segments
  const phaseSegments = useMemo(() => {
    const fertileStart = Math.max(ovulationDay - 2, periodDuration + 1);
    const fertileEnd = Math.min(ovulationDay + 2, cycleLength - 1);
    const segs = [
      { key: 'menstrual',  days: periodDuration,                  color: '#F2C4C4' },
      { key: 'follicular', days: Math.max(1, fertileStart - periodDuration), color: '#B8D8BC' },
      { key: 'ovulation',  days: fertileEnd - fertileStart + 1,   color: '#F9E4B7' },
      { key: 'luteal',     days: Math.max(1, cycleLength - fertileEnd), color: '#C8BCE0' },
    ];
    return segs.filter(s => s.days > 0);
  }, [cycleLength, periodDuration, ovulationDay]);

  const fmtDate = (d) => format(d, 'd MMMM', { locale });
  const fmtRange = (a, b) => `${format(a, 'd')} – ${format(b, 'd MMMM', { locale })}`;

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({
      ...(cycleProfile || {}),
      lastPeriodStart: format(lastPeriodDate, 'yyyy-MM-dd'),
      cycleLength,
      periodLength: periodDuration,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isToday = (d) => {
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.on_surface} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>{t('period_calculator.title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('period_calculator.subtitle')}</Text>

        {/* ── Section: Your Inputs ── */}
        <Text style={styles.sectionLabel}>{t('period_calculator.section_inputs', { defaultValue: 'YOUR INPUTS' })}</Text>

        {/* First day of period */}
        <Text style={styles.fieldLabel}>{t('period_calculator.first_day')}</Text>
        <View style={styles.dateRow}>
          <Pressable style={[styles.dateField, { flex: 1 }]} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateFieldText}>
              {format(lastPeriodDate, 'd MMMM yyyy', { locale })}
            </Text>
            <View style={styles.calIconBox}>
              <Calendar size={16} color="#FFFFFF" />
            </View>
          </Pressable>
          {!isToday(lastPeriodDate) && (
            <Pressable style={styles.todayChip} onPress={() => setLastPeriodDate(new Date())}>
              <Text style={styles.todayChipText}>{t('dashboard.today_label', { defaultValue: 'Today' })}</Text>
            </Pressable>
          )}
        </View>

        {/* Duration stepper */}
        <Text style={styles.fieldLabel}>{t('period_calculator.how_long')}</Text>
        <Stepper
          value={periodDuration}
          onDecrement={() => setPeriodDuration(v => Math.max(1, v - 1))}
          onIncrement={() => setPeriodDuration(v => Math.min(10, v + 1))}
          min={1}
          max={10}
          unit={t('common.days', { defaultValue: 'days' })}
        />

        {/* Cycle length stepper */}
        <Text style={styles.fieldLabel}>{t('period_calculator.avg_cycle')}</Text>
        <Stepper
          value={cycleLength}
          onDecrement={() => setCycleLength(v => Math.max(20, v - 1))}
          onIncrement={() => setCycleLength(v => Math.min(45, v + 1))}
          min={20}
          max={45}
          unit={t('common.days', { defaultValue: 'days' })}
        />

        {/* ── Phase timeline strip ── */}
        <Text style={styles.sectionLabel}>{t('period_calculator.section_cycle', { defaultValue: 'YOUR CYCLE PHASES' })}</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineBar}>
            {phaseSegments.map((seg, i) => (
              <View
                key={seg.key}
                style={[
                  styles.timelineSegment,
                  { flex: seg.days, backgroundColor: seg.color },
                  i === 0 && styles.timelineSegmentFirst,
                  i === phaseSegments.length - 1 && styles.timelineSegmentLast,
                ]}
              />
            ))}
          </View>
          <View style={styles.timelineLegend}>
            {phaseSegments.map(seg => (
              <View key={seg.key} style={[styles.timelineLegendItem, { flex: seg.days }]}>
                <View style={[styles.timelineLegendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.timelineLegendText} numberOfLines={1}>
                  {t(`phases.${seg.key}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Section: Estimated Dates ── */}
        <Text style={styles.sectionLabel}>{t('period_calculator.section_results', { defaultValue: 'ESTIMATED DATES' })}</Text>

        {/* Ovulation card */}
        <View style={[styles.resultCard, styles.resultCardOvulation]}>
          <View style={[styles.resultIconWrap, { backgroundColor: '#FEF8EC' }]}>
            <Sun size={20} color="#C9A84C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultLabel}>{t('period_calculator.ovul_label')}</Text>
            <Text style={[styles.resultValue, { color: '#B8932A' }]}>{fmtDate(ovulationDate)}</Text>
          </View>
        </View>

        {/* Next period card */}
        <View style={[styles.resultCard, styles.resultCardPeriod]}>
          <View style={[styles.resultIconWrap, { backgroundColor: '#FDF0F0' }]}>
            <Droplets size={20} color="#C97C7C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultLabel}>{t('period_calculator.period_label')}</Text>
            <Text style={[styles.resultValue, { color: '#B86060' }]}>{fmtRange(nextPeriodStart, nextPeriodEnd)}</Text>
          </View>
        </View>

        {/* ── Save to Profile ── */}
        {onSave && (
          <Pressable
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
          >
            {saved
              ? <Check size={18} color="#FFFFFF" />
              : <Text style={styles.saveBtnText}>{t('period_calculator.save_profile', { defaultValue: 'Save to My Profile' })}</Text>
            }
          </Pressable>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <CalendarPicker
        visible={showPicker}
        selectedDate={lastPeriodDate}
        onSelect={setLastPeriodDate}
        onClose={() => setShowPicker(false)}
        locale={locale}
      />
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F9F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    opacity: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: colors.on_surface,
    lineHeight: 30,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.on_surface_variant,
    lineHeight: 21,
    marginBottom: 28,
    opacity: 0.8,
  },
  sectionLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    opacity: 0.45,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginTop: 4,
  },
  fieldLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface,
    marginBottom: 10,
    opacity: 0.85,
  },

  // Date row with Today chip
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  dateField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dateFieldText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface,
  },
  calIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayChipText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.primary,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stepBtn: {
    width: 60,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F2',
  },
  stepBtnDisabled: { opacity: 0.25 },
  stepBtnText: {
    fontSize: 24,
    color: colors.on_surface,
    fontFamily: 'Outfit_400Regular',
  },
  stepValueWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 5,
  },
  stepValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: colors.on_surface,
  },
  stepUnit: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },

  // Phase timeline
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  timelineBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  timelineSegment: {
    height: '100%',
  },
  timelineSegmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  timelineSegmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  timelineLegend: {
    flexDirection: 'row',
  },
  timelineLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 1,
    overflow: 'hidden',
  },
  timelineLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLegendText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9,
    color: colors.on_surface_variant,
    opacity: 0.7,
  },

  // Result cards
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  resultCardOvulation: {
    borderLeftWidth: 4,
    borderLeftColor: '#F9E4B7',
  },
  resultCardPeriod: {
    borderLeftWidth: 4,
    borderLeftColor: '#F2C4C4',
  },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F8FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    opacity: 0.65,
  },
  resultValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    lineHeight: 30,
  },

  // Save button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnDone: {
    backgroundColor: '#6EA87B',
  },
  saveBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Calendar modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9F9F2',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calMonthLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.on_surface,
  },
  calDowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calDowText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    opacity: 0.5,
    letterSpacing: 0.5,
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calDayCell: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  calDayCellSelected: {
    backgroundColor: colors.primary,
  },
  calDayCellToday: {
    backgroundColor: '#EBF2EB',
  },
  calDayText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface,
  },
  calDayTextSel: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
  },
  calDayTextToday: {
    color: colors.primary,
    fontFamily: 'Outfit_700Bold',
  },
  calCancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F9F9F2',
  },
  calCancelText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.on_surface_variant,
    opacity: 0.6,
  },
});
