import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
  format,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ChevronLeft, Timer, History, Trash2, CircleCheck, CircleAlert, CircleX } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppAlert } from '../components/AppAlertProvider';
import { PHASE_LABELS } from '../utils/cycle';
import { getLocalActiveFast, setLocalActiveFast } from '../services/appStorage';
import {
  getActiveFast,
  startFast,
  endFast,
  loadFastingHistory,
  deleteFastingLog,
} from '../services/fastingService';
import { scheduleFastingGoalNotification, cancelFastingGoalNotification } from '../services/notificationService';

const PRESET_HOURS = [12, 14, 16];

// Recommendation level per phase — drives the banner color/icon. Text comes
// from i18n (fasting.recommendation.<phaseKey>), keyed the same way the rest
// of the app keys phase-specific copy.
const PHASE_FASTING_LEVEL = {
  menstrual: 'avoid',
  follicular: 'good',
  ovulation: 'ok',
  luteal: 'avoid',
};

const formatElapsed = (totalSeconds) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const FastingScreen = ({ onBack, currentPhaseKey = 'follicular', user }) => {
  const { t } = useTranslation();
  const { showAlert } = useAppAlert();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeFast, setActiveFast] = useState(null);
  const [history, setHistory] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  const [selectedPreset, setSelectedPreset] = useState(PRESET_HOURS[1]);
  const [customMode, setCustomMode] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState('week');

  const notificationIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Local cache renders instantly (and works offline); the Supabase
      // read right after reconciles it with the source of truth.
      const cachedActive = await getLocalActiveFast(user.id);
      if (isMounted && cachedActive) setActiveFast(cachedActive);

      const [remoteActive, historyRows] = await Promise.all([
        getActiveFast(getToken, user.id),
        loadFastingHistory(getToken, user.id),
      ]);

      if (!isMounted) return;
      setActiveFast(remoteActive);
      await setLocalActiveFast(user.id, remoteActive);
      setHistory(historyRows);
      setLoading(false);
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!activeFast) return undefined;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeFast]);

  const elapsedSeconds = activeFast
    ? Math.max(0, Math.floor((nowTick - new Date(activeFast.startAt).getTime()) / 1000))
    : 0;
  const goalSeconds = (activeFast?.goalHours || 0) * 3600;
  const progressPercent = goalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / goalSeconds) * 100)) : 0;

  const phaseLevel = PHASE_FASTING_LEVEL[currentPhaseKey] || 'ok';
  const bannerIcon =
    phaseLevel === 'good' ? (
      <CircleCheck size={20} color="#3D8B54" />
    ) : phaseLevel === 'ok' ? (
      <CircleAlert size={20} color="#B8882A" />
    ) : (
      <CircleX size={20} color="#C9524F" />
    );
  const bannerTitleKey = `fasting.recommendation_title_${phaseLevel}`;

  const summaryTotalHours = useMemo(() => {
    const now = new Date();
    const interval =
      summaryPeriod === 'week'
        ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
        : { start: startOfMonth(now), end: endOfMonth(now) };

    return history
      .filter((log) => log.startAt && isWithinInterval(new Date(log.startAt), interval))
      .reduce((sum, log) => sum + (log.actualHours || 0), 0);
  }, [history, summaryPeriod]);

  const handleStart = async () => {
    const goalHours = customMode ? Number(customHours) : selectedPreset;
    if (!goalHours || goalHours <= 0 || Number.isNaN(goalHours)) {
      showAlert(t('settings.error'), t('fasting.invalid_duration'));
      return;
    }

    setStarting(true);
    try {
      const created = await startFast(getToken, user.id, { goalHours, phaseKey: currentPhaseKey });
      if (!created) throw new Error('start_failed');
      setActiveFast(created);
      await setLocalActiveFast(user.id, created);
      notificationIdRef.current = await scheduleFastingGoalNotification(goalHours);
    } catch (error) {
      showAlert(t('settings.error'), t('fasting.start_failed'));
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!activeFast) return;
    setEnding(true);
    try {
      const updated = await endFast(getToken, user.id, activeFast.id, activeFast.startAt, {
        goalHours: activeFast.goalHours,
        phaseKey: activeFast.phaseKey,
      });
      if (!updated) throw new Error('end_failed');
      setActiveFast(null);
      await setLocalActiveFast(user.id, null);
      setHistory((prev) => [updated, ...prev]);
      await cancelFastingGoalNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    } catch (error) {
      showAlert(t('settings.error'), t('fasting.end_failed'));
    } finally {
      setEnding(false);
    }
  };

  const handleDeleteHistory = (id) => {
    const performDelete = async () => {
      const ok = await deleteFastingLog(getToken, user.id, id);
      if (ok) setHistory((prev) => prev.filter((log) => log.id !== id));
    };
    showAlert(t('common.delete'), t('fasting.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: performDelete },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>{t('fasting.title')}</Text>
        </View>

        <View style={[styles.banner, styles[`banner_${phaseLevel}`]]}>
          {bannerIcon}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>
              {t(bannerTitleKey)} · {PHASE_LABELS[currentPhaseKey] || PHASE_LABELS.follicular}
            </Text>
            <Text style={styles.bannerText}>
              {t(`fasting.recommendation.${currentPhaseKey}`, {
                defaultValue: t('fasting.recommendation.follicular'),
              })}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : activeFast ? (
          <View style={styles.clockCard}>
            <Text style={styles.elapsedLabel}>{t('fasting.elapsed_label')}</Text>
            <Text style={styles.elapsedTime}>{formatElapsed(elapsedSeconds)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {t('fasting.goal_progress', { percent: progressPercent, goal: activeFast.goalHours })}
            </Text>
            <Text style={styles.startedAtText}>
              {t('fasting.started_at', { time: format(new Date(activeFast.startAt), 'HH:mm') })}
            </Text>
            <Pressable style={styles.endBtn} onPress={handleEnd} disabled={ending}>
              {ending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.endBtnText}>{t('fasting.end_btn')}</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.clockCard}>
            <Text style={styles.goalLabel}>{t('fasting.goal_label')}</Text>
            <View style={styles.presetRow}>
              {PRESET_HOURS.map((hours) => (
                <Pressable
                  key={hours}
                  style={[styles.presetPill, !customMode && selectedPreset === hours && styles.presetPillActive]}
                  onPress={() => {
                    setCustomMode(false);
                    setSelectedPreset(hours);
                  }}
                >
                  <Text style={[styles.presetText, !customMode && selectedPreset === hours && styles.presetTextActive]}>
                    {hours}h
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.presetPill, customMode && styles.presetPillActive]}
                onPress={() => setCustomMode(true)}
              >
                <Text style={[styles.presetText, customMode && styles.presetTextActive]}>
                  {t('fasting.custom_option')}
                </Text>
              </Pressable>
            </View>

            {customMode ? (
              <TextInput
                style={styles.customInput}
                value={customHours}
                onChangeText={(v) => setCustomHours(v.replace(/[^0-9]/g, ''))}
                placeholder={t('fasting.custom_placeholder')}
                placeholderTextColor={colors.on_surface_variant}
                keyboardType="numeric"
              />
            ) : null}

            <Pressable style={styles.startBtn} onPress={handleStart} disabled={starting}>
              {starting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Timer size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.startBtnText}>{t('fasting.start_btn')}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <History size={18} color={colors.on_surface_variant} />
            <Text style={styles.historySectionTitle}>{t('fasting.history_title')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Pressable
              style={[styles.summaryPill, summaryPeriod === 'week' && styles.summaryPillActive]}
              onPress={() => setSummaryPeriod('week')}
            >
              <Text style={[styles.summaryPillText, summaryPeriod === 'week' && styles.summaryPillTextActive]}>
                {t('fasting.summary_week')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.summaryPill, summaryPeriod === 'month' && styles.summaryPillActive]}
              onPress={() => setSummaryPeriod('month')}
            >
              <Text style={[styles.summaryPillText, summaryPeriod === 'month' && styles.summaryPillTextActive]}>
                {t('fasting.summary_month')}
              </Text>
            </Pressable>
            <Text style={styles.summaryTotalText}>
              {t('fasting.summary_total', { hours: summaryTotalHours.toFixed(1) })}
            </Text>
          </View>

          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>{t('fasting.no_history')}</Text>
          ) : (
            history.map((log) => (
              <View key={log.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyCardTitle}>
                    {format(new Date(log.startAt), 'dd/MM/yyyy')} · {format(new Date(log.startAt), 'HH:mm')}–
                    {log.endAt ? format(new Date(log.endAt), 'HH:mm') : '—'}
                  </Text>
                  <Text style={styles.historyCardSub}>
                    {t('fasting.history_row_hours', { hours: (log.actualHours || 0).toFixed(1) })}
                    {log.phaseKey ? ` · ${PHASE_LABELS[log.phaseKey] || ''}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => handleDeleteHistory(log.id)} hitSlop={10}>
                  <Trash2 size={16} color={colors.on_surface_variant} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F2' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  title: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 28, color: colors.on_surface, lineHeight: 32 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  banner_good: { backgroundColor: '#EDF7EE', borderColor: '#CFE8D2' },
  banner_ok: { backgroundColor: '#FDF5E4', borderColor: '#F0DFAF' },
  banner_avoid: { backgroundColor: '#FDF0EF', borderColor: '#F3CFCC' },
  bannerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: colors.on_surface, marginBottom: 4 },
  bannerText: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.on_surface_variant, lineHeight: 19 },

  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  elapsedLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  elapsedTime: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 48, color: colors.on_surface, marginBottom: 16 },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F1E8',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface, marginBottom: 6 },
  startedAtText: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.on_surface_variant, marginBottom: 20 },
  endBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C9524F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFF' },

  goalLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginBottom: 16 },
  presetPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  presetPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface },
  presetTextActive: { color: '#FFF' },
  customInput: {
    width: '100%',
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  startBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFF' },

  historySection: { marginTop: 8 },
  historySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  historySectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.on_surface },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  summaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  summaryPillActive: { backgroundColor: colors.primary_container, borderColor: colors.primary },
  summaryPillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: colors.on_surface_variant },
  summaryPillTextActive: { color: colors.on_primary_container },
  summaryTotalText: { flex: 1, textAlign: 'right', fontFamily: 'Outfit_700Bold', fontSize: 13, color: colors.on_surface },
  emptyHistoryText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F1E8',
    gap: 12,
  },
  historyCardTitle: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: colors.on_surface, marginBottom: 4 },
  historyCardSub: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.on_surface_variant },
});
