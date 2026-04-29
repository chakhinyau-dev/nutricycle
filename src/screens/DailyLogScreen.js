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
  Platform,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import {
  ChevronLeft,
  Check,
  Smile,
  Frown,
  Meh,
  History,
  CalendarDays,
  CheckCircle2,
  Star,
  X,
  Trash2,
  Edit2,
  AlertCircle,
} from 'lucide-react-native';
import { loadDailyLogs, saveDailyLog, deleteDailyLog } from '../services/dailyLogService';

const { width } = Dimensions.get('window');

export const DailyLogScreen = ({ onBack, cycleInfo, onRefreshAI }) => {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [mood, setMood] = useState('excelente');
  const [symptoms, setSymptoms] = useState(['fatiga']);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [editingLogDate, setEditingLogDate] = useState(null); // Track if we are editing a past log

  const MOODS = [
    { id: 'triste', label: t('dailylog.moods.triste'), icon: <Frown size={24} />, color: '#94A3B8' },
    { id: 'neutral', label: t('dailylog.moods.neutral'), icon: <Meh size={24} />, color: '#CBD5E1' },
    { id: 'feliz', label: t('dailylog.moods.feliz'), icon: <Smile size={24} />, color: '#A3B3A5' },
    { id: 'excelente', label: t('dailylog.moods.excelente'), icon: <Star size={24} />, color: colors.primary },
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
      if (logs[0]) {
        setMood(logs[0].mood || 'excelente');
        setSymptoms(logs[0].symptoms || []);
        setNotes(logs[0].notes || '');
      }
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
      const saved = await saveDailyLog(getToken, user.id, {
        mood,
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

  const handleDeleteLog = async (item) => {
    if (!user?.id) return;
    
    const confirm = Platform.OS === 'web' ? true : await new Promise(resolve => {
        // In a real app we'd use Alert.alert here, for simplicity:
        resolve(true);
    });

    if (confirm) {
      const success = await deleteDailyLog(getToken, user.id, item.id, item.log_date || format(new Date(item.logged_at), 'yyyy-MM-dd'));
      if (success) {
        const logs = await loadDailyLogs(getToken, user.id);
        setHistory(logs);
      }
    }
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
            <Text style={styles.tagLabel}>{format(new Date(), "dd MMM", { locale: es }).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('dailylog.title')}</Text>
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
        <Text style={styles.cardTitle}>{t('dailylog.notes_title')}</Text>
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

      <View style={styles.historySection}>
        <View style={styles.historyPreview}>
          <History size={20} color={colors.primary} />
          <Text style={styles.historySectionTitle}>{t('dailylog.history_title', 'Historial Reciente')}</Text>
        </View>

        {recentHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <AlertCircle size={24} color="#CBD5E1" />
            <Text style={styles.emptyHistoryText}>{t('dailylog.no_history', 'Aún no tienes registros guardados.')}</Text>
          </View>
        ) : (
          recentHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyCardMain}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyDate}>{format(new Date(item.logged_at), 'dd MMMM, yyyy', { locale: es })}</Text>
                  <View style={styles.historyActions}>
                    <Pressable onPress={() => handleEditLog(item)} style={styles.actionBtn}>
                      <Edit2 size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteLog(item)} style={[styles.actionBtn, { marginLeft: 12 }]}>
                      <Trash2 size={16} color="#EB5757" />
                    </Pressable>
                  </View>
                </View>
                
                <View style={styles.historyTags}>
                   <View style={[styles.miniMood, { backgroundColor: MOODS.find(m => m.id === item.mood)?.color + '20' }]}>
                      <Text style={[styles.miniMoodText, { color: MOODS.find(m => m.id === item.mood)?.color }]}>
                        {t(`dailylog.moods.${item.mood}`).toUpperCase()}
                      </Text>
                   </View>
                    <Text style={styles.historyPhaseTag}>· {t(`phases.${item.phase_key}`)}</Text>
                </View>

                {item.symptoms.length > 0 && (
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
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>

    <View style={styles.footer}>
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
    </View>
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
    marginTop: 60,
    marginBottom: 20,
  },
  historySectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: '#64748B',
    marginLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F1E8',
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
  },
  saveButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.on_primary,
    marginRight: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 20,
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
