import { GoogleGenerativeAI } from '@google/generative-ai';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { ChevronLeft, Sparkles, Send, BrainCircuit, Activity, Zap, Lock, Crown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { env } from '../lib/env';

const { width, height } = Dimensions.get('window');

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

export const AIPredictorScreen = ({ onBack, cycleInfo, cycleProfile, user, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const isPremium = cycleProfile?.isPremium;

  const generatePrediction = async (userPrompt = '') => {
    if (!isPremium) return;
    if (!env.geminiApiKey) {
      setError(t('ai.ai_unconfigured'));
      return;
    }

    setLoading(true);
    setError(null);

    const context = `
      User Info:
      - Name: ${user?.firstName || 'User'}
      - Current Phase: ${cycleInfo.currentPhaseKey}
      - Cycle Day: ${cycleInfo.dayOfCycle}
      - Symptoms mentioned in prompt: ${userPrompt}
      
      Task: Provide a short, professional, and encouraging health prediction or recommendation for this specific cycle phase. 
      Focus on nutrition, energy levels, and wellness. 
      IMPORTANT: Respond in the following language: ${(i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('es') ? 'Spanish' : 'English'}.
      Format the response in JSON: {"title": "Summary", "advice": "Main advice", "vitality": "Energy level 1-10"}.
    `;

    const modelIds = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    let lastError = null;

    for (const modelId of modelIds) {
      try {
        console.log(`[AI] Using SDK with model: ${modelId}`);
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(context);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          const jsonMatch = text.match(/\{.*\}/s);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Análisis Personalizado', advice: text, vitality: '7' };
          
          setPrediction(parsed);
          setLoading(false);
          return; // Success!
        }
      } catch (err) {
        console.warn(`[AI] SDK error for ${modelId}:`, err.message);
        lastError = err.message;
      }
    }

    console.error('[AI Predictor Final Failure]:', lastError);
    setError(t('ai.ai_failed'));
    setLoading(false);
  };

  useEffect(() => {
    if (isPremium) {
      generatePrediction(t('ai.general_checkin', { defaultValue: 'Consulta general diaria' }));
    }
  }, [isPremium]);

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800' }}
          style={styles.hero}
        >
          <View style={styles.overlay} />
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>{t('ai.title')}</Text>
            <View style={{ width: 44 }} />
          </View>
        </ImageBackground>

        <View style={styles.lockContainer}>
           <View style={styles.lockIconBox}>
              <Lock size={40} color={colors.primary} />
           </View>
           <Text style={styles.lockTitle}>{t('ai.premium_title')}</Text>
           <Text style={styles.lockSub}>
              {t('ai.premium_sub')}
           </Text>
           
           <Pressable 
            style={styles.upgradeBtn} 
            onPress={() => onNavigate('subscription')}
           >
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
        source={{ uri: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800' }}
        style={styles.hero}
      >
        <View style={styles.overlay} />
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <ChevronLeft size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('ai.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.heroContent}>
           <View style={styles.aiBadge}>
              <Sparkles size={14} color="#A78BFA" fill="#A78BFA" />
              <Text style={styles.aiBadgeText}>{t('ai.powered_by')}</Text>
           </View>
           <Text style={styles.heroTitle}>{t('ai.hero_title')}</Text>
           <Text style={styles.heroSub}>{t('ai.hero_sub')}</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <BrainCircuit size={20} color={colors.primary} />
             <Text style={styles.cardTitle}>{t('ai.status_phase', { phase: t(`phases.${cycleInfo.currentPhaseKey}`).toUpperCase() })}</Text>
          </View>
          
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>{t('ai.processing')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
               <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : prediction ? (
            <View style={styles.predictionBox}>
               <Text style={styles.predictionTitle}>{prediction.title}</Text>
               <Text style={styles.predictionAdvice}>{prediction.advice}</Text>
               
               <View style={styles.vitalityRow}>
                  <Zap size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.vitalityText}>{t('ai.vitality', { score: prediction.vitality })}</Text>
               </View>
            </View>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('ai.feel_today')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('ai.placeholder')}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable 
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} 
              onPress={() => generatePrediction(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>
        
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
  hero: {
    height: 320,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
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
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 1,
  },
  heroContent: {
    paddingHorizontal: 28,
    marginTop: 40,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  aiBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#A78BFA',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: '#FFF',
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1E8',
  },
  cardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.on_surface_variant,
  },
  predictionBox: {
    marginTop: 8,
  },
  predictionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.primary,
    marginBottom: 12,
  },
  predictionAdvice: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
    lineHeight: 24,
    marginBottom: 20,
  },
  vitalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vitalityText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#F59E0B',
  },
  inputContainer: {
    marginTop: 8,
  },
  inputLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 120,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  errorText: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#BE123B',
    fontSize: 13,
    textAlign: 'center',
  },
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
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 12,
    textAlign: 'center',
  },
  lockSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
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
  upgradeBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#FFF',
    letterSpacing: 1,
  },
  maybeLater: {
    marginTop: 24,
    padding: 12,
  },
  maybeLaterText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface_variant,
  }
});
