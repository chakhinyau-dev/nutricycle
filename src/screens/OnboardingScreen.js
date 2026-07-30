import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { ChevronRight } from 'lucide-react-native';
import { NutricycleLogo } from '../components/NutricycleLogo';

const ONBOARDING_STEPS = [
  {
    titleKey: 'onboarding.step3_title',
    subtitleKey: 'onboarding.step3_subtitle',
    image: require('../../assets/third.jpg'),
  },
  {
    titleKey: 'onboarding.step1_title',
    subtitleKey: 'onboarding.step1_subtitle',
    image: require('../../assets/first.jpg'),
  },
  {
    titleKey: 'onboarding.step2_title',
    subtitleKey: 'onboarding.step2_subtitle',
    image: require('../../assets/second.jpg'),
  },
];

export const OnboardingScreen = ({ onFinish }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  const current = ONBOARDING_STEPS[step];

  return (
    <View style={styles.container}>
      <ImageBackground source={current.image} style={styles.backgroundImage}>
        <View style={styles.overlay} />

        <View style={styles.logoHeader}>
          <NutricycleLogo width={160} height={70} showText={false} ringColor="#FFFFFF" />
        </View>

        <View style={styles.content}>
          <View style={styles.textGroup}>
            <Text style={styles.stepIndicator}>
              {t('onboarding.story_indicator', { current: step + 1, total: ONBOARDING_STEPS.length })}
            </Text>
            <Text style={styles.title}>{t(current.titleKey)}</Text>
            <Text style={styles.subtitle}>{t(current.subtitleKey)}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dotContainer}>
              {ONBOARDING_STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, step === i && styles.activeDot]} />
              ))}
            </View>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>
                {step === ONBOARDING_STEPS.length - 1 ? t('onboarding.start') : t('onboarding.next')}
              </Text>
              <ChevronRight size={20} color={colors.on_primary} />
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  logoHeader: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  textGroup: {
    marginBottom: 48,
  },
  stepIndicator: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    color: '#FFF',
    lineHeight: 52,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 18,
    color: '#FFF',
    lineHeight: 28,
    opacity: 0.9,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
  },
  activeDot: {
    backgroundColor: '#FFF',
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  nextText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_primary,
    marginRight: 8,
    letterSpacing: 1,
  }
});
