import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {
  ChevronRight,
  Calendar,
  Sparkles,
  Activity,
  AlertCircle,
  Apple,
  Zap,
  Heart
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';
import {
  getCycleInsights,
  normalizeCycleProfile,
  formatLastPeriodForDisplay,
  parseDisplayLastPeriodToISO,
} from '../utils/cycle';

const getWizardSteps = (t) => [
  {
    icon: Calendar,
    title: t('wizard.step1_title'),
    subtitle: t('wizard.step1_sub'),
  },
  {
    icon: Heart,
    title: t('wizard.step3_title'),
    subtitle: t('wizard.step3_sub'),
  },
];

export const WizardScreen = ({ onFinish, cycleProfile }) => {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const WIZARD_STEPS = useMemo(() => getWizardSteps(t), [t]);
  const defaults = normalizeCycleProfile(cycleProfile);

  const [step, setStep] = useState(0);
  const [displayDate, setDisplayDate] = useState(formatLastPeriodForDisplay(defaults.lastPeriodStart));
  const [cycleLength, setCycleLength] = useState(defaults.cycleLength || 28);
  const [periodLength, setPeriodLength] = useState(defaults.periodLength || 5);
  const [goal, setGoal] = useState(defaults.goal || 'balance');

  const lastPeriodStart = useMemo(() => parseDisplayLastPeriodToISO(displayDate), [displayDate]);

  const handleNext = () => {
    if (step < WIZARD_STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    const preview = getCycleInsights({
      lastPeriodStart,
      cycleLength: String(cycleLength),
      periodLength: String(periodLength),
      goal,
    });
    onFinish({
      lastPeriodStart,
      cycleLength: String(cycleLength),
      periodLength: String(periodLength),
      currentPhase: preview.currentPhaseKey,
      goal,
    });
  };

  const incrementCycle  = () => setCycleLength(prev => Math.min(45, prev + 1));
  const decrementCycle  = () => setCycleLength(prev => Math.max(21, prev - 1));
  const incrementPeriod = () => setPeriodLength(prev => Math.min(10, prev + 1));
  const decrementPeriod = () => setPeriodLength(prev => Math.max(1,  prev - 1));

  const current = WIZARD_STEPS[step];
  const Icon = current.icon;

  const progressSegmentWidth =
    WIZARD_STEPS.length > 0 ? (windowWidth - 64) / WIZARD_STEPS.length - 8 : 0;

  return (
    <View style={styles.outer}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: Math.max(windowHeight - 48, 520) },
          ]}
        >
          <View style={styles.scrollInner}>
            <View>
              <View style={styles.progressHeader}>
                {WIZARD_STEPS.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressBar,
                      { width: progressSegmentWidth },
                      step >= index && { backgroundColor: colors.primary },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.main}>
                <View style={styles.iconCircle}>
                  <Icon size={40} color={colors.primary} />
                </View>

                <Text style={styles.title}>{current.title}</Text>

                {step === 0 && (
                  <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>{t('wizard.last_period_label')}</Text>
                      <TextInput
                        value={displayDate}
                        onChangeText={setDisplayDate}
                        style={styles.input}
                        placeholder="24/04/2026"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>

                    <View style={styles.sectionDivider} />
                    <Text style={styles.adjustLabel}>{t('wizard.adjust_cycle_label')}</Text>

                    <View style={styles.stepperRow}>
                      <View style={styles.stepperGroup}>
                        <Text style={styles.label}>{t('wizard.cycle_length_label')}</Text>
                        <View style={styles.stepper}>
                          <Pressable style={styles.stepBtn} onPress={decrementCycle}>
                            <Text style={styles.stepBtnText}>−</Text>
                          </Pressable>
                          <View style={styles.stepValueWrap}>
                            <Text style={styles.stepNum}>{cycleLength}</Text>
                            <Text style={styles.stepUnit}>{t('wizard.days_unit')}</Text>
                          </View>
                          <Pressable style={styles.stepBtn} onPress={incrementCycle}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.stepperGroup}>
                        <Text style={styles.label}>{t('wizard.period_days_label')}</Text>
                        <View style={styles.stepper}>
                          <Pressable style={styles.stepBtn} onPress={decrementPeriod}>
                            <Text style={styles.stepBtnText}>−</Text>
                          </Pressable>
                          <View style={styles.stepValueWrap}>
                            <Text style={styles.stepNum}>{periodLength}</Text>
                            <Text style={styles.stepUnit}>{t('wizard.days_unit')}</Text>
                          </View>
                          <Pressable style={styles.stepBtn} onPress={incrementPeriod}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {step === 1 && (
                  <View style={styles.goalSection}>
                    <View style={styles.goalsGrid}>
                      {[
                        { id: 'acne', label: t('wizard.goals.acne'), icon: Sparkles },
                        { id: 'pcos', label: t('wizard.goals.pcos'), icon: Activity },
                        { id: 'periods', label: t('wizard.goals.periods'), icon: AlertCircle },
                        { id: 'digestion', label: t('wizard.goals.digestion'), icon: Apple },
                        { id: 'energy', label: t('wizard.goals.energy'), icon: Zap },
                        { id: 'balance', label: t('wizard.goals.balance'), icon: Heart }
                      ].map((item) => {
                        const ItemIcon = item.icon;
                        const isSelected = goal === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            style={[styles.goalCard, isSelected && styles.goalCardActive]}
                            onPress={() => setGoal(item.id)}
                          >
                            <View style={[styles.goalIconCircle, isSelected && styles.goalIconActive]}>
                              <ItemIcon size={20} color={isSelected ? '#FFFFFF' : colors.primary} />
                            </View>
                            <Text style={[styles.goalCardText, isSelected && styles.goalTextActive]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <Text style={styles.subtitle}>{current.subtitle}</Text>
              </View>
            </View>

            <Pressable style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>
                {step === WIZARD_STEPS.length - 1 ? t('wizard.btn_finish') : t('wizard.btn_continue')}
              </Text>
              <ChevronRight size={20} color={colors.on_primary} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 24,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 60,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(74,68,83,0.1)',
    borderRadius: 2,
  },
  main: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 17,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 12,
    marginTop: 24,
  },
  formCard: {
    marginTop: 36,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    gap: 18,
  },
  inputGroup: {
    width: '100%',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#EFEDE4',
    marginVertical: 4,
  },
  adjustLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  stepperGroup: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBFBF7',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEE8DE',
    paddingHorizontal: 8,
    height: 60,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.on_surface,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  stepValueWrap: {
    alignItems: 'center',
  },
  stepNum: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.on_surface,
    lineHeight: 24,
  },
  stepUnit: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
  },
  label: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  input: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEE8DE',
    backgroundColor: '#FBFBF7',
    paddingHorizontal: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: colors.on_surface,
  },
  goalSection: {
    marginTop: 28,
    width: '100%',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEDE4',
    height: 125,
  },
  goalCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalCardText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface,
    textAlign: 'center',
    lineHeight: 14,
  },
  goalTextActive: {
    color: '#FFFFFF',
  },
  previewCard: {
    marginTop: 36,
    width: '100%',
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#EFEDE4',
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F0F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginLeft: 8,
  },
  previewPhase: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 36,
    color: colors.on_surface,
    marginTop: 18,
  },
  previewText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.on_surface,
    marginTop: 8,
  },
  previewSubtext: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface_variant,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
    marginTop: 20,
  },
  buttonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_primary,
    letterSpacing: 2,
    marginRight: 12,
  },
});
