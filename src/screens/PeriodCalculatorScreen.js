import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { addDays, format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

// ── Stepper ────────────────────────────────────────────────────────────────
const Stepper = ({ value, onDecrement, onIncrement, min = 1, max = 99 }) => (
  <View style={styles.stepperRow}>
    <Pressable
      style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
      onPress={onDecrement}
      disabled={value <= min}
    >
      <Text style={styles.stepBtnText}>−</Text>
    </Pressable>
    <Text style={styles.stepValue}>{value}</Text>
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
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const CalendarPicker = ({ visible, selectedDate, onSelect, onClose, locale, isSpanish }) => {
  const [viewMonth, setViewMonth] = useState(
    selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : new Date()
  );

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDow = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Mon = 0

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
          {/* Month navigation */}
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

          {/* Day-of-week headers */}
          <View style={styles.calDowRow}>
            {DOW.map((d, i) => (
              <Text key={i} style={styles.calDowText}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
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
                return (
                  <Pressable
                    key={ci}
                    style={[styles.calDayCell, isSel && styles.calDayCellSelected]}
                    onPress={() => selectDay(day)}
                  >
                    {day ? (
                      <Text style={[styles.calDayText, isSel && styles.calDayTextSel]}>
                        {day}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Pressable style={styles.calCancelBtn} onPress={onClose}>
            <Text style={styles.calCancelText}>{isSpanish ? 'Cancelar' : 'Cancel'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────
export const PeriodCalculatorScreen = ({ onBack }) => {
  const { i18n } = useTranslation();
  const isSpanish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es');
  const locale = isSpanish ? es : enUS;

  const [lastPeriodDate, setLastPeriodDate] = useState(new Date());
  const [periodDuration, setPeriodDuration] = useState(3);
  const [cycleLength, setCycleLength] = useState(28);
  const [showPicker, setShowPicker] = useState(false);

  const { ovulationDate, nextPeriodStart, nextPeriodEnd } = useMemo(() => {
    const ovulation = addDays(lastPeriodDate, cycleLength - 14);
    const periodStart = addDays(lastPeriodDate, cycleLength);
    const periodEnd = addDays(periodStart, periodDuration - 1);
    return { ovulationDate: ovulation, nextPeriodStart: periodStart, nextPeriodEnd: periodEnd };
  }, [lastPeriodDate, cycleLength, periodDuration]);

  const fmtDate = (d) => format(d, 'd MMMM', { locale });
  const fmtRange = (a, b) =>
    `${format(a, 'd')} – ${format(b, 'd MMMM', { locale })}`;

  const T = {
    title: isSpanish ? 'Calculadora de Período' : 'Period Calculator',
    subtitle: isSpanish
      ? 'Registra tu período para ajustar tu ciclo y estimar tu próxima ovulación.'
      : 'Log your period to adjust your cycle or estimate your next period and ovulation window.',
    firstDay: isSpanish ? 'Primer día de tu último período' : 'First day of your last period',
    howLong: isSpanish ? '¿Cuántos días duró?' : 'How many days did it last?',
    avgCycle: isSpanish ? 'Duración del ciclo (días)' : 'Average cycle length (days)',
    ovulLabel: isSpanish ? 'Fecha de ovulación estimada' : 'Estimated ovulation date',
    periodLabel: isSpanish ? 'Próximo período estimado' : 'Estimated period date',
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{T.title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{T.subtitle}</Text>

        {/* ── First day of period ── */}
        <Text style={styles.fieldLabel}>{T.firstDay}</Text>
        <Pressable style={styles.dateField} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateFieldText}>
            {format(lastPeriodDate, 'd MMMM yyyy', { locale })}
          </Text>
          <View style={styles.calIconBox}>
            <Calendar size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* ── Duration stepper ── */}
        <Text style={styles.fieldLabel}>{T.howLong}</Text>
        <Stepper
          value={periodDuration}
          onDecrement={() => setPeriodDuration((v) => Math.max(1, v - 1))}
          onIncrement={() => setPeriodDuration((v) => Math.min(10, v + 1))}
          min={1}
          max={10}
        />

        {/* ── Cycle length stepper ── */}
        <Text style={styles.fieldLabel}>{T.avgCycle}</Text>
        <Stepper
          value={cycleLength}
          onDecrement={() => setCycleLength((v) => Math.max(20, v - 1))}
          onIncrement={() => setCycleLength((v) => Math.min(45, v + 1))}
          min={20}
          max={45}
        />

        {/* ── Result cards ── */}
        <View style={styles.resultsRow}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>{T.ovulLabel}</Text>
            <Text style={styles.resultValue}>{fmtDate(ovulationDate)}</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>{T.periodLabel}</Text>
            <Text style={styles.resultValue}>{fmtRange(nextPeriodStart, nextPeriodEnd)}</Text>
          </View>
        </View>
      </ScrollView>

      <CalendarPicker
        visible={showPicker}
        selectedDate={lastPeriodDate}
        onSelect={setLastPeriodDate}
        onClose={() => setShowPicker(false)}
        locale={locale}
        isSpanish={isSpanish}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: colors.on_surface,
  },

  // Content
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
  },

  // Field label
  fieldLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface_variant,
    marginBottom: 10,
    opacity: 0.8,
  },

  // Date field
  dateField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 16,
    color: colors.on_surface,
  },
  calIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#A3B3A5',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 56,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F2',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    fontSize: 22,
    color: colors.on_surface,
    lineHeight: 26,
    fontFamily: 'Outfit_400Regular',
  },
  stepValue: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.on_surface,
  },

  // Result cards
  resultsRow: {
    gap: 14,
    marginTop: 8,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#A3B3A5',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    shadowColor: '#A3B3A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  resultLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    opacity: 0.7,
  },
  resultValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
  },

  // Calendar modal backdrop
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
    backgroundColor: '#A3B3A5',
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
