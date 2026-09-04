import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  ImageBackground,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Camera, Trash2, Lock, Crown, Save, History, X, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppAlert } from '../components/AppAlertProvider';
import { prepareImageForUpload } from '../utils/imagePrep';
import {
  analyzeMealPhoto,
  saveMealLog,
  loadMealHistory,
  deleteMealLog,
  checkAndIncrementUsage,
  uploadMealPhoto,
  MEAL_PHOTO_MAX_DIMENSION,
} from '../services/mealAnalysisService';

// How much recent history to fold into the evaluation's context — same
// counts AIChatScreen.js uses, so the grounding is comparable either way.
const RECENT_LOGS_COUNT = 5;
const RECENT_MEALS_COUNT = 5;

// "Analizar plato" — replaces Predictor IA. Reuses the same hero/premium-lock
// visual pattern AIPredictorScreen.js used, for a consistent look across the
// AI screens in this app.
export const MealAnalyzerScreen = ({ onBack, cycleInfo, cycleProfile = {}, user, dailyLogs = [], isPremium, onNavigate }) => {
  const { t } = useTranslation();
  const { showAlert } = useAppAlert();
  const { getToken } = useAuth();

  const [pickedImage, setPickedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [items, setItems] = useState(null);
  const [phaseNote, setPhaseNote] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const loadHistory = async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    const rows = await loadMealHistory(getToken, user.id);
    setHistory(rows);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (isPremium) loadHistory();
  }, [isPremium, user?.id]);

  const resetAnalysis = () => {
    setPickedImage(null);
    setItems(null);
    setPhaseNote('');
    setEvaluation('');
    setAnalysisError(null);
  };

  // Mirrors the context object AIChatScreen.js builds for getGeminiChatResponse
  // — same shape, same recent-logs/meals counts — so the "is this good or bad
  // for me right now" evaluation is grounded exactly the way a real chat
  // message would be, not a separately-tuned subset of the same data.
  const buildAnalysisContext = () => ({
    currentPhase: cycleInfo?.currentPhaseKey,
    day: cycleInfo?.cycleDay,
    userName: user?.firstName || user?.fullName,
    cycleLength: cycleProfile?.cycleLength ?? cycleProfile?.cycle_length,
    periodLength: cycleProfile?.periodLength ?? cycleProfile?.period_length,
    recentLogs: dailyLogs.slice(0, RECENT_LOGS_COUNT).map((l) => ({
      date: l.log_date || l.logged_at,
      mood: l.mood,
      energyLevel: l.energy_level,
      symptoms: l.symptoms,
    })),
    recentMeals: history.slice(0, RECENT_MEALS_COUNT).map((m) => ({
      date: m.loggedAt,
      items: (m.items || []).map((i) => i.name),
      calories: Math.round(m.totalCalories),
      protein: Math.round(m.totalProtein),
      carbs: Math.round(m.totalCarbs),
      fat: Math.round(m.totalFat),
    })),
  });

  const runAnalysis = async (asset) => {
    setPickedImage(asset);
    setItems(null);
    setPhaseNote('');
    setEvaluation('');
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      // Checked (and incremented) before the actual Gemini call — the cost
      // is incurred here regardless of whether the result ever gets saved,
      // so the cap has to gate the call itself, not the save step.
      const usage = await checkAndIncrementUsage(getToken, user?.id);
      if (!usage.allowed) {
        setAnalysisError(t('meal_analyzer.daily_cap_reached', { cap: usage.cap }));
        return;
      }

      const analysis = await analyzeMealPhoto(asset, buildAnalysisContext());
      if (!analysis.items.length) {
        setAnalysisError(t('meal_analyzer.no_food_detected'));
      } else {
        setItems(analysis.items);
        setPhaseNote(analysis.phaseNote);
        setEvaluation(analysis.evaluation);
      }
    } catch (err) {
      console.error('[MealAnalyzer] Analysis failed:', err);
      setAnalysisError(err.message || t('meal_analyzer.analysis_failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Resized right after picking, before it ever lands in state or gets
  // uploaded — the same imagePrep.js discipline AdminScreen.js already
  // uses for recipe/video/food images. Without this, the raw camera/library
  // asset (often several MB) is what ends up in Storage; this way both the
  // Gemini call and the eventual meal-photos upload reuse one already-small
  // asset instead of the original.
  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('settings.error'), t('settings.gallery_permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const prepared = await prepareImageForUpload(result.assets[0], { maxDimension: MEAL_PHOTO_MAX_DIMENSION });
    runAnalysis(prepared);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('settings.error'), t('meal_analyzer.camera_permission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const prepared = await prepareImageForUpload(result.assets[0], { maxDimension: MEAL_PHOTO_MAX_DIMENSION });
    runAnalysis(prepared);
  };

  const handleChooseSource = () => {
    showAlert(
      t('meal_analyzer.analyze_btn'),
      t('meal_analyzer.choose_source'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('meal_analyzer.take_photo'), onPress: handleTakePhoto },
        { text: t('meal_analyzer.choose_library'), onPress: handlePickFromLibrary },
      ]
    );
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!items || !items.length) return;
    setIsSaving(true);
    try {
      const normalized = items.map((item) => ({
        name: item.name,
        portion: item.portion,
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
      }));
      // Uploaded only now, on confirmed save — not at analysis time, so a
      // discarded/cancelled analysis never leaves an orphaned photo in
      // storage.
      const photoPath = pickedImage ? await uploadMealPhoto(getToken, user.id, pickedImage) : null;

      const saved = await saveMealLog(getToken, user.id, {
        items: normalized,
        phaseKey: cycleInfo?.currentPhaseKey,
        phaseNote,
        evaluation,
        photoPath,
      });
      if (!saved) {
        throw new Error(t('meal_analyzer.save_failed'));
      }
      if (photoPath) saved.photoUrl = pickedImage.uri;
      setHistory((prev) => [saved, ...prev]);
      resetAnalysis();
    } catch (err) {
      showAlert(t('settings.error'), err.message || t('meal_analyzer.save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = (id) => {
    const performDelete = async () => {
      const ok = await deleteMealLog(getToken, id);
      if (ok) setHistory((prev) => prev.filter((m) => m.id !== id));
    };
    showAlert(
      t('common.delete'),
      t('meal_analyzer.delete_confirm'),
      [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: performDelete }]
    );
  };

  const totals = items
    ? items.reduce(
        (acc, item) => ({
          calories: acc.calories + (Number(item.calories) || 0),
          protein: acc.protein + (Number(item.protein) || 0),
          carbs: acc.carbs + (Number(item.carbs) || 0),
          fat: acc.fat + (Number(item.fat) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
    : null;

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800' }}
          style={styles.hero}
        >
          <View style={styles.overlay} />
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>{t('meal_analyzer.title')}</Text>
            <View style={{ width: 44 }} />
          </View>
        </ImageBackground>

        <View style={styles.lockContainer}>
          <View style={styles.lockIconBox}>
            <Lock size={40} color={colors.primary} />
          </View>
          <Text style={styles.lockTitle}>{t('meal_analyzer.premium_title')}</Text>
          <Text style={styles.lockSub}>{t('meal_analyzer.premium_sub')}</Text>
          <Pressable style={styles.upgradeBtn} onPress={() => onNavigate('subscription')}>
            <Crown size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.upgradeBtnText}>{t('ai.upgrade_btn')}</Text>
          </Pressable>
          <Pressable onPress={onBack} style={styles.maybeLater}>
            <Text style={styles.maybeLaterText}>{t('ai.maybe_later')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800' }}
        style={styles.hero}
      >
        <View style={styles.overlay} />
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <ChevronLeft size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('meal_analyzer.title')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('meal_analyzer.hero_title')}</Text>
          <Text style={styles.heroSub}>{t('meal_analyzer.hero_sub')}</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {pickedImage ? (
            <Image source={{ uri: pickedImage.uri }} style={styles.pickedImagePreview} />
          ) : null}

          {analyzing ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>{t('meal_analyzer.analyzing')}</Text>
            </View>
          ) : analysisError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{analysisError}</Text>
            </View>
          ) : items ? (
            <View>
              {items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemRowTop}>
                    <TextInput
                      style={styles.itemNameInput}
                      value={item.name}
                      onChangeText={(v) => handleItemChange(index, 'name', v)}
                    />
                    <Pressable onPress={() => handleRemoveItem(index)} hitSlop={10}>
                      <Trash2 size={18} color={colors.on_surface_variant} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.itemPortionInput}
                    value={item.portion}
                    placeholder={t('meal_analyzer.portion_placeholder')}
                    onChangeText={(v) => handleItemChange(index, 'portion', v)}
                  />
                  <View style={styles.macroInputRow}>
                    {['calories', 'protein', 'carbs', 'fat'].map((field) => (
                      <View key={field} style={styles.macroInputBox}>
                        <Text style={styles.macroInputLabel}>{t(`meal_analyzer.${field}`)}</Text>
                        <TextInput
                          style={styles.macroInput}
                          value={String(item[field])}
                          keyboardType="numeric"
                          onChangeText={(v) => handleItemChange(index, field, v.replace(/[^0-9.]/g, ''))}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {totals && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsText}>
                    {t('meal_analyzer.totals', {
                      calories: Math.round(totals.calories),
                      protein: Math.round(totals.protein),
                      carbs: Math.round(totals.carbs),
                      fat: Math.round(totals.fat),
                    })}
                  </Text>
                </View>
              )}

              {phaseNote ? <Text style={styles.phaseNoteText}>{phaseNote}</Text> : null}

              {evaluation ? (
                <View style={styles.evaluationBox}>
                  <View style={styles.evaluationHeader}>
                    <Sparkles size={14} color={colors.primary} />
                    <Text style={styles.evaluationTitle}>{t('meal_analyzer.evaluation_title')}</Text>
                  </View>
                  <Text style={styles.evaluationText}>{evaluation}</Text>
                </View>
              ) : null}

              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>{t('meal_analyzer.save')}</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={resetAnalysis}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.analyzeBtn} onPress={handleChooseSource}>
              <Camera size={22} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.analyzeBtnText}>{t('meal_analyzer.analyze_btn')}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <History size={18} color={colors.on_surface_variant} />
            <Text style={styles.historySectionTitle}>{t('meal_analyzer.history_title')}</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>{t('meal_analyzer.no_history')}</Text>
          ) : (
            history.map((meal) => (
              <Pressable
                key={meal.id}
                style={styles.historyCard}
                onPress={() => setSelectedMeal(meal)}
              >
                {meal.photoUrl ? (
                  <Image source={{ uri: meal.photoUrl }} style={styles.historyThumb} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyCardTitle} numberOfLines={1}>
                    {meal.items.map((i) => i.name).join(', ') || t('meal_analyzer.untitled_meal')}
                  </Text>
                  <Text style={styles.historyCardSub}>
                    {t('meal_analyzer.totals', {
                      calories: Math.round(meal.totalCalories),
                      protein: Math.round(meal.totalProtein),
                      carbs: Math.round(meal.totalCarbs),
                      fat: Math.round(meal.totalFat),
                    })}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => { e?.stopPropagation?.(); handleDeleteHistory(meal.id); }}
                  hitSlop={10}
                >
                  <Trash2 size={16} color={colors.on_surface_variant} />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* History detail modal — tapping a saved entry reviews its full
          breakdown instead of just the compact list row. */}
      <Modal
        visible={!!selectedMeal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedMeal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('meal_analyzer.detail_title')}</Text>
              <Pressable onPress={() => setSelectedMeal(null)} style={styles.closeBtn}>
                <X size={20} color={colors.on_surface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalList}>
              {selectedMeal?.photoUrl ? (
                <Image source={{ uri: selectedMeal.photoUrl }} style={styles.detailPhoto} />
              ) : null}

              {(selectedMeal?.items || []).map((item, index) => (
                <View key={index} style={styles.detailItemRow}>
                  <View style={styles.detailItemTop}>
                    <Text style={styles.detailItemName}>{item.name}</Text>
                    {item.portion ? <Text style={styles.detailItemPortion}>{item.portion}</Text> : null}
                  </View>
                  <Text style={styles.detailItemMacros}>
                    {t('meal_analyzer.totals', {
                      calories: Math.round(item.calories) || 0,
                      protein: Math.round(item.protein) || 0,
                      carbs: Math.round(item.carbs) || 0,
                      fat: Math.round(item.fat) || 0,
                    })}
                  </Text>
                </View>
              ))}

              {selectedMeal && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsText}>
                    {t('meal_analyzer.totals', {
                      calories: Math.round(selectedMeal.totalCalories),
                      protein: Math.round(selectedMeal.totalProtein),
                      carbs: Math.round(selectedMeal.totalCarbs),
                      fat: Math.round(selectedMeal.totalFat),
                    })}
                  </Text>
                </View>
              )}

              {selectedMeal?.phaseNote ? (
                <Text style={styles.phaseNoteText}>{selectedMeal.phaseNote}</Text>
              ) : null}

              {selectedMeal?.evaluation ? (
                <View style={styles.evaluationBox}>
                  <View style={styles.evaluationHeader}>
                    <Sparkles size={14} color={colors.primary} />
                    <Text style={styles.evaluationTitle}>{t('meal_analyzer.evaluation_title')}</Text>
                  </View>
                  <Text style={styles.evaluationText}>{selectedMeal.evaluation}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 280, width: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 16, color: '#FFF', letterSpacing: 1 },
  heroContent: { paddingHorizontal: 28, marginTop: 40 },
  heroTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#FFF', lineHeight: 40, marginBottom: 12 },
  heroSub: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
  content: { padding: 24, paddingTop: 32 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  pickedImagePreview: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  analyzeBtn: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#FFF' },
  loader: { padding: 20, alignItems: 'center' },
  loaderText: { marginTop: 12, fontFamily: 'Outfit_600SemiBold', color: colors.on_surface_variant },
  errorBox: { padding: 16, backgroundColor: '#FFF1F2', borderRadius: 12, borderWidth: 1, borderColor: '#FDA4AF' },
  errorText: { fontFamily: 'Outfit_600SemiBold', color: '#BE123B', fontSize: 13, textAlign: 'center' },
  itemRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F1E8' },
  itemRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  itemNameInput: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.on_surface, paddingVertical: 4 },
  itemPortionInput: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.on_surface_variant, marginBottom: 10, paddingVertical: 2 },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  macroInputBox: { flex: 1 },
  macroInputLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 9, color: colors.on_surface_variant, textTransform: 'uppercase', marginBottom: 4 },
  macroInput: {
    backgroundColor: '#F8FAFB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.on_surface,
  },
  totalsRow: { marginTop: 16, padding: 14, backgroundColor: '#F4F2EC', borderRadius: 12 },
  totalsText: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: colors.on_surface, textAlign: 'center' },
  phaseNoteText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    fontStyle: 'italic',
    marginTop: 14,
    lineHeight: 20,
  },
  evaluationBox: {
    backgroundColor: colors.primary_container,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  evaluationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  evaluationTitle: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: colors.on_primary_container, textTransform: 'uppercase', letterSpacing: 0.5 },
  evaluationText: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.on_surface, lineHeight: 21 },
  saveBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFF' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.on_surface_variant },
  historySection: { marginTop: 8 },
  historySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  historySectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.on_surface },
  emptyHistoryText: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.on_surface_variant, opacity: 0.7, textAlign: 'center', marginTop: 8 },
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
  historyThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F4F2EC' },
  historyCardTitle: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.on_surface, marginBottom: 4 },
  historyCardSub: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.on_surface_variant },
  lockContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  lockIconBox: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  lockTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: colors.on_surface, marginBottom: 12, textAlign: 'center' },
  lockSub: { fontFamily: 'Outfit_500Medium', fontSize: 16, color: colors.on_surface_variant, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  upgradeBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFF', letterSpacing: 1 },
  maybeLater: { marginTop: 24, padding: 12 },
  maybeLaterText: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: colors.on_surface_variant },

  // History detail modal — same bottom-sheet pattern as NutritionScreen.js's
  // swap modal, for visual consistency across the app's modals.
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,68,83,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#F9F9F2',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '85%',
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEDE4',
  },
  modalTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 26, color: colors.on_surface },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: { paddingHorizontal: 28, paddingTop: 20 },
  detailPhoto: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16, backgroundColor: '#F4F2EC' },
  detailItemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1E8' },
  detailItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailItemName: { fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.on_surface, flex: 1 },
  detailItemPortion: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.on_surface_variant },
  detailItemMacros: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.on_surface_variant },
});
