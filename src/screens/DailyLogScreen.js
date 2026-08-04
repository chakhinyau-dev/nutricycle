import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import {
  ChevronLeft,
  Check,
  Smile,
  Frown,
  Meh,
  Laugh,
  History,
  CalendarDays,
  CheckCircle2,
  X,
  Trash2,
  Edit2,
  Leaf,
  BatteryLow,
  BatteryMedium,
  Zap,
} from 'lucide-react-native';
import { loadDailyLogs, saveDailyLog, deleteDailyLog } from '../services/dailyLogService';

const { width } = Dimensions.get('window');

export const DailyLogScreen = ({ onBack, cycleInfo, onRefreshAI }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('es') ? es : enUS;
  const { getToken } = useAuth();
  const { user } = useUser();
  const [mood, setMood] = useState('excelente');
  const [energyLevel, setEnergyLevel] = useState('media');
  const [symptoms, setSymptoms] = useState([]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [editingLogDate, setEditingLogDate] = useState(null);

  const MOODS = [
    { id: 'triste', label: t('dailylog.moods.triste'), icon: <Frown size={24} />, color: '#94A3B8' },
    { id: 'neutral', label: t('dailylog.moods.neutral'), icon: <Meh size={24} />, color: '#CBD5E1' },
    { id: 'feliz', label: t('dailylog.moods.feliz'), icon: <Smile size={24} />, color: '#A3B3A5' },
    { id: 'excelente', label: t('dailylog.moods.excelente'), icon: <Laugh size={24} />, color: colors.primary },
  ];

  const SYMPTOMS = [
    { id: 'fatiga', label: t('dailylog.symptoms.fatiga') },
    { id: 'colicos', label: t('dailylog.symptoms.colicos') },
    { id: 'dolorcabeza', label: t('dailylog.symptoms.dolorcabeza') },
    { id: 'acne', label: t('dailylog.symptoms.acne') },
    { id: 'estres', label: t('dailylog.symptoms.estres') },
    { id: 'insomnio', label: t('dailylog.symptoms.insomnio') },
    { id: 'inflamacion', label: t('dailylog.symptoms.inflamacion') },
  ];

  const ENERGY_LEVELS = [
    { id: 'baja', label: t('dailylog.energy.baja'), icon: <BatteryLow size={20} /> },
    { id: 'media', label: t('dailylog.energy.media'), icon: <BatteryMedium size={20} /> },
    { id: 'alta', label: t('dailylog.energy.alta'), icon: <Zap size={20} /> },
  ];

  const PHASE_COLORS = {
    menstrual: '#F2C4C4',
    follicular: '#B8D8BC',
    ovulation: '#F9E4B7',
    luteal: '#C8BCE0',
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!user?.id) {
        return;
      }

      const logs = await loadDailyLogs(getToken, user.id);

      if (!mounted) {
        return;
      }

      setHistory(logs);

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const latest = logs[0];
      const latestDate = latest?.logged_at
        ? format(new Date(latest.logged_at), 'yyyy-MM-dd')
        : latest?.log_date;

      if (latest && latestDate === todayStr) {
        // Today's entry already exists — pre-fill for editing
        setMood(latest.mood || 'excelente');
        setSymptoms(latest.symptoms || []);
        setNotes(latest.notes || '');
        setEditingLogDate(latest.log_date || latest.logged_at);
      }
      // else: leave form at defaults for a brand-new entry
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [getToken, user?.id]);

  const recentHistory = useMemo(() => history.slice(0, 7), [history]);

  const toggleSymptom = (id) => {
    if (symptoms.includes(id)) {
      setSymptoms(symptoms.filter((s) => s !== id));
    } else {
      setSymptoms([...symptoms, id]);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      return;
    }

    setIsSaving(true);
    try {
      await saveDailyLog(getToken, user.id, {
        mood,
        energy_level: energyLevel,
        symptoms,
        notes,
        cycle_day: cycleInfo?.cycleDay,
        phase_key: cycleInfo?.currentPhaseKey,
        logged_at: editingLogDate ? new Date(editingLogDate).toISOString() : new Date().toISOString(),
      });
      
      const logs = await loadDailyLogs(getToken, user.id);
      setHistory(logs);
      
      // Real-time re-analysis
      if (onRefreshAI) {
        onRefreshAI();
      }
      
      setMood('excelente');
      setSymptoms([]);
      setNotes('');
      setIsSaving(false);
      setIsDone(true);
      setEditingLogDate(null);
      
      setTimeout(() => {
        onBack();
      }, 1800);
    } catch (err) {
      console.error('Save error:', err);
      setIsSaving(false);
    }
  };

  const handleEditLog = (item) => {
    setMood(item.mood || 'neutral');
    setSymptoms(item.symptoms || []);
    setNotes(item.notes || '');
    setEditingLogDate(item.log_date || item.logged_at);
    // Scroll to top to see the form
  };

  const handleDeleteLog = (item) => {
    if (!user?.id) return;
    Alert.alert(
      t('dailylog.delete_title'),
      t('dailylog.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDailyLog(getToken, user.id, item.id, item.log_date || format(new Date(item.logged_at), 'yyyy-MM-dd'));
            if (success) {
              const logs = await loadDailyLogs(getToken, user.id);
              setHistory(logs);
            }
          },
        },
      ]
    );
  };

  if (isDone) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle2 size={80} color={colors.primary} />
        <Text style={styles.successTitle}>{t('dailylog.success_title')}</Text>
        <Text style={styles.successSubtitle}>
          {t('dailylog.success_sub')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <View style={styles.calendarTag}>
            <CalendarDays size={14} color={colors.primary} />
            <Text style={styles.tagLabel}>{format(new Date(), "dd MMM", { locale }).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('dailylog.title')}</Text>
        <View style={styles.headerMeta}>
          {cycleInfo?.cycleDay != null && (
            <Text style={styles.cycleDayText}>
              {t('dashboard.cycle_day', { day: cycleInfo.cycleDay, defaultValue: `Day ${cycleInfo.cycleDay} of your cycle` })}
            </Text>
          )}
          {cycleInfo?.currentPhaseKey && (
            <View style={[styles.phaseBadge, { backgroundColor: PHASE_COLORS[cycleInfo.currentPhaseKey] || '#E8EDE9' }]}>
              <Text style={styles.phaseBadgeText}>{t(`phases.${cycleInfo.currentPhaseKey}`)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('dailylog.mood_title')}</Text>
          <Text style={styles.cardSubtitle}>{t('dailylog.mood_sub')}</Text>
        </View>
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <Pressable
              key={m.id}
              style={[
                styles.moodItem,
                mood === m.id && { backgroundColor: `${m.color}15`, borderColor: m.color },
              ]}
              onPress={() => setMood(m.id)}
            >
              <View style={styles.moodIcon}>
                {React.cloneElement(m.icon, { color: mood === m.id ? m.color : '#CBD5E1' })}
              </View>
              <Text style={[styles.moodLabel, mood === m.id && { color: m.color }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 24 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('dailylog.energy_title')}</Text>
          <Text style={styles.cardSubtitle}>{t('dailylog.energy_sub')}</Text>
        </View>
        <View style={styles.energyRow}>
          {ENERGY_LEVELS.map((e) => {
            const isActive = energyLevel === e.id;
            return (
              <Pressable
                key={e.id}
                style={[styles.energyBtn, isActive && styles.energyBtnActive]}
                onPress={() => setEnergyLevel(e.id)}
              >
                {React.cloneElement(e.icon, {
                  color: isActive ? colors.on_primary : colors.on_surface_variant,
                  strokeWidth: isActive ? 2.5 : 1.5,
                })}
                <Text style={[styles.energyBtnText, isActive && styles.energyBtnTextActive]}>
                  {e.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 24 }]}>
        <View style={styles.cardHeaderFlex}>
          <View>
            <Text style={styles.cardTitle}>{t('dailylog.symptoms_title')}</Text>
            <Text style={styles.cardSubtitle}>{t('dailylog.symptoms_sub')}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{symptoms.length}</Text>
          </View>
        </View>
        <View style={styles.symptomsWrap}>
          {SYMPTOMS.map((s) => {
            const isSelected = symptoms.includes(s.id);
            return (
              <Pressable
                key={s.id}
                style={[styles.symptomPill, isSelected && styles.symptomPillActive]}
                onPress={() => toggleSymptom(s.id)}
              >
                <Text style={[styles.symptomText, isSelected && styles.symptomTextActive]}>{s.label}</Text>
                {isSelected && <X size={14} color={colors.on_primary} style={{ marginLeft: 6 }} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 24 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('dailylog.notes_title')}</Text>
          <Text style={styles.cardSubtitle}>{t('dailylog.notes_sub')}</Text>
        </View>
        <View style={styles.noteInputBox}>
          <TextInput
            style={styles.textInput}
            placeholder={t('dailylog.notes_placeholder')}
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.placeholder}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      {editingLogDate && (
        <View style={styles.editingBanner}>
          <Edit2 size={14} color={colors.primary} />
          <Text style={styles.editingBannerText}>
            {t('dailylog.editing_label')} {format(new Date(editingLogDate), 'dd MMM yyyy', { locale })}
          </Text>
          <Pressable onPress={() => {
            setEditingLogDate(null);
            if (history[0]) {
              setMood(history[0].mood || 'excelente');
              setSymptoms(history[0].symptoms || []);
              setNotes(history[0].notes || '');
            }
          }}>
            <X size={14} color={colors.primary} />
          </Pressable>
        </View>
      )}

      <View style={styles.historySection}>
        <View style={styles.historyPreview}>
          <History size={16} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.historySectionTitle}>{t('dailylog.history_title')}</Text>
            <Text style={styles.historySectionSub}>{t('dailylog.history_sub')}</Text>
          </View>
        </View>

        {recentHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Leaf size={24} color={colors.primary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyHistoryText}>{t('dailylog.no_history')}</Text>
          </View>
        ) : (
          recentHistory.map((item) => {
            const moodData    = MOODS.find(m => m.id === item.mood);
            const phaseColors = {
              menstrual: '#F2C4C4', follicular: '#B8D8BC',
              ovulation: '#F9E4B7', luteal: '#C8BCE0',
            };
            const phaseColor = phaseColors[item.phase_key] || colors.primary;
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={[styles.historyPhaseStripe, { backgroundColor: phaseColor }]} />
                <View style={styles.historyCardMain}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyDate}>
                      {format(new Date(item.logged_at), 'dd MMM yyyy', { locale })}
                    </Text>
                    <View style={styles.historyActions}>
                      <Pressable onPress={() => handleEditLog(item)} style={styles.actionBtn}>
                        <Edit2 size={15} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteLog(item)} style={[styles.actionBtn, { marginLeft: 10 }]}>
                        <Trash2 size={15} color={colors.on_surface_variant} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.historyTags}>
                    {moodData && (
                      <View style={[styles.miniMood, { backgroundColor: moodData.color + '20' }]}>
                        <Text style={[styles.miniMoodText, { color: moodData.color }]}>
                          {t(`dailylog.moods.${item.mood}`).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.miniPhase, { backgroundColor: phaseColor + '18' }]}>
                      <Text style={[styles.miniPhaseText, { color: phaseColor }]}>
                        {t(`phases.${item.phase_key}`)}
                      </Text>
                    </View>
                  </View>

                  {item.symptoms?.length > 0 && (
                    <View style={styles.historySymptoms}>
                      {item.symptoms.slice(0, 3).map(s => (
                        <View key={s} style={styles.miniSymptom}>
                          <Text style={styles.miniSymptomText}>{t(`dailylog.symptoms.${s}`)}</Text>
                        </View>
                      ))}
                      {item.symptoms.length > 3 && (
                        <Text style={styles.moreSymptoms}>+{item.symptoms.length - 3}</Text>
                      )}
                    </View>
                  )}

                  {item.notes ? (
                    <Text style={styles.historyNotes} numberOfLines={1}>{`"${item.notes}"`}</Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      <Pressable style={[styles.saveButton, isSaving && { opacity: 0.8 }]} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color={colors.on_primary} />
        ) : (
          <>
            <Text style={styles.saveButtonText}>{t('dailylog.save_btn')}</Text>
            <Check size={20} color={colors.on_primary} strokeWidth={3} />
          </>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  calendarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary_container,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  tagLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.primary,
    marginLeft: 6,
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 38,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  cycleDayText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface,
    letterSpacing: 0.3,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  energyBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F1E8',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    gap: 8,
  },
  energyBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  energyBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  energyBtnTextActive: {
    color: colors.on_primary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: (width - 100) / 4,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F1E8',
    backgroundColor: '#FFF',
  },
  moodIcon: {
    marginBottom: 10,
  },
  moodLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#A3B3A520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#A3B3A5',
  },
  symptomsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  symptomPillActive: {
    backgroundColor: '#A3B3A5',
    borderColor: '#A3B3A5',
  },
  symptomText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#64748B',
  },
  symptomTextActive: {
    color: '#FFF',
  },
  noteInputBox: {
    backgroundColor: '#FAF9F6',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  textInput: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    height: 100,
  },
  historySection: {
    marginTop: 36,
    marginBottom: 20,
  },
  historySectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.on_surface,
  },
  historySectionSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginTop: 1,
  },
  historyCardMain: {
    flex: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: 4,
  },
  historyTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniMood: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniMoodText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  historyPhaseTag: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginLeft: 6,
  },
  historySymptoms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  miniSymptom: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  miniSymptomText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: '#64748B',
  },
  moreSymptoms: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.primary,
    alignSelf: 'center',
  },
  historyNotes: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyHistoryText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  historyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    paddingLeft: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F1E8',
    overflow: 'hidden',
    position: 'relative',
  },
  historyDate: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.on_primary,
    marginRight: 10,
  },
  // Editing banner
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2EE',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8D6C9',
  },
  editingBannerText: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  // History card phase stripe
  historyPhaseStripe: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: 4,
    borderRadius: 2,
  },

  // Phase badge in history
  miniPhase: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  miniPhaseText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  successTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    marginTop: 24,
    marginBottom: 12,
  },
  successSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 24,
  },
});
