import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { ChevronLeft, User, Mail, Calendar, TimerReset, Droplets } from 'lucide-react-native';
import {
  getCycleInsights,
  normalizeCycleProfile,
  formatLastPeriodForDisplay,
  parseDisplayLastPeriodToISO,
} from '../utils/cycle';

export const EditProfileScreen = ({ onBack, onSave, cycleProfile, user }) => {
  const { t } = useTranslation();
  const defaults = normalizeCycleProfile(cycleProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.fullName || user?.firstName || '');
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
  );
  const [displayLastPeriod, setDisplayLastPeriod] = useState(
    formatLastPeriodForDisplay(defaults.lastPeriodStart)
  );
  const [cycleLength, setCycleLength] = useState(String(defaults.cycleLength));
  const [periodLength, setPeriodLength] = useState(String(defaults.periodLength));

  const lastPeriodStart = useMemo(
    () => parseDisplayLastPeriodToISO(displayLastPeriod),
    [displayLastPeriod]
  );

  const preview = useMemo(
    () => getCycleInsights({ lastPeriodStart, cycleLength, periodLength }),
    [cycleLength, lastPeriodStart, periodLength]
  );

  const handleSave = async () => {
    if (!onSave) {
      onBack?.();
      return;
    }

    setIsSaving(true);
    try {
      const currentFullName = user?.fullName || user?.firstName || '';
      if (name !== currentFullName && user) {
        const parts = name.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        await user.update({ firstName, lastName });
      }

      await onSave({
        currentPhase: preview.currentPhaseKey,
        lastPeriodStart,
        cycleLength,
        periodLength,
        full_name: name,
      });

      Alert.alert(t('common.success', { defaultValue: '¡Listo!' }), t('edit_profile.updated_success'));
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(t('settings.error'), t('edit_profile.update_error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('edit_profile.title')}</Text>
        <Pressable onPress={handleSave} disabled={isSaving} style={{ opacity: isSaving ? 0.5 : 1 }}>
          {isSaving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={styles.saveText}>{t('common.save')}</Text>
          }
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('edit_profile.current_summary')}</Text>
          <Text style={styles.heroTitle}>{t(`phases.${preview.currentPhaseKey}`)}</Text>
          <Text style={styles.heroSubtitle}>
            {t('edit_profile.subtitle', { day: preview.cycleDay, days: preview.daysUntilNextPeriod })}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('edit_profile.name_label')}</Text>
            <View style={styles.inputRow}>
              <User size={20} color={colors.on_surface_variant} />
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('edit_profile.email_label')}</Text>
            <View style={styles.inputRow}>
              <Mail size={20} color={colors.on_surface_variant} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('edit_profile.last_period_label')}</Text>
            <View style={styles.inputRow}>
              <Calendar size={20} color={colors.on_surface_variant} />
              <TextInput
                style={styles.input}
                value={displayLastPeriod}
                onChangeText={setDisplayLastPeriod}
                placeholder={t('edit_profile.last_period_placeholder')}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>{t('edit_profile.cycle_length_label')}</Text>
              <View style={styles.inputRow}>
                <TimerReset size={20} color={colors.on_surface_variant} />
                <TextInput
                  style={styles.input}
                  value={cycleLength}
                  onChangeText={setCycleLength}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>{t('edit_profile.period_days_label')}</Text>
              <View style={styles.inputRow}>
                <Droplets size={20} color={colors.on_surface_variant} />
                <TextInput
                  style={styles.input}
                  value={periodLength}
                  onChangeText={setPeriodLength}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.noteText}>
            {t('edit_profile.note')}
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
  },
  saveText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  content: {
    padding: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  heroLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.secondary,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
  },
  heroSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginTop: 10,
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  half: {
    flex: 1,
  },
  label: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.on_surface,
    marginLeft: 12,
  },
  footerNote: {
    marginTop: 44,
    paddingHorizontal: 6,
  },
  noteText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
  },
});
