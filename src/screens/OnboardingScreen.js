import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Dimensions, Image } from 'react-native';
import { colors } from '../theme/colors';
import { ChevronRight, Flower2 } from 'lucide-react-native';

const ONBOARDING_STEPS = [
  {
    title: 'Sincroniza con tu ritmo',
    subtitle: 'Bienvenida a una nueva forma de entender tu cuerpo y nutrición.',
    image: { uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' }
  },
  {
    title: 'Nutrición Consciente',
    subtitle: 'Recibe recomendaciones de alimentos específicos para cada fase de tu ciclo.',
    image: { uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800' }
  },
  {
    title: 'Tú eres la Curadora',
    subtitle: 'Toma el control de tu bienestar con datos y sabiduría ancestral.',
    image: { uri: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800' }
  }
];

export const OnboardingScreen = ({ onFinish }) => {
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
        
        <View style={styles.content}>
          <View style={styles.textGroup}>
            <Text style={styles.stepIndicator}>HISTORIA {step + 1} / {ONBOARDING_STEPS.length}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dotContainer}>
              {ONBOARDING_STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, step === i && styles.activeDot]} />
              ))}
            </View>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>{step === 2 ? 'COMENZAR' : 'SIGUIENTE'}</Text>
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
  header: {
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 80,
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
