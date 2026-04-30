import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import morningImg from '../../assets/greeting_morning.png';
import afternoonImg from '../../assets/greeting_afternoon.png';
import nightImg from '../../assets/greeting_night.png';
import { colors } from '../theme/colors';


const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';

export const DashboardScreen = ({
  onNavigate,
  user,
  currentPhaseKey = 'follicular',
  cycleInfo,
}) => {
  const { t } = useTranslation();
  const phaseKey = currentPhaseKey || 'follicular';

  const getTimeBasedGreeting = () => {
    const hours = new Date().getHours();
    const name = user?.firstName || t('common.user_fallback', { defaultValue: 'bonita' });
    if (hours >= 5 && hours < 12) return t('dashboard.greeting_morning', { name });
    if (hours >= 12 && hours < 19) return t('dashboard.greeting_afternoon', { name });
    return t('dashboard.greeting_evening', { name });
  };

  const getTimeBasedImage = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return morningImg;
    if (hours >= 12 && hours < 19) return afternoonImg;
    return nightImg;
  };

  const PHASE_CONTENT = {
    menstrual: {
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
      title: t('dashboard.phase_titles.menstrual'),
      msg: t('phase_menstrual_msg'),
    },
    follicular: {
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
      title: t('dashboard.phase_titles.follicular'),
      msg: t('phase_follicular_msg'),
    },
    ovulation: {
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800',
      title: t('dashboard.phase_titles.ovulation'),
      msg: t('phase_ovulation_msg'),
    },
    luteal: {
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      title: t('dashboard.phase_titles.luteal'),
      msg: t('phase_luteal_msg'),
    },
  };

  const currentContent = PHASE_CONTENT[phaseKey] || PHASE_CONTENT.follicular;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.greetingText}>{getTimeBasedGreeting()}</Text>
        <Pressable onPress={() => onNavigate('settings')}>
           <Image source={{ uri: user?.imageUrl || fallbackAvatar }} style={styles.avatar} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 40 }} />

      {/* 2. Main Emotional Card */}
      <View style={styles.mainCard}>
        <Image source={getTimeBasedImage()} style={styles.mainCardImage} resizeMode="contain" />
        <View style={styles.mainCardOverlay}>
          <Text style={styles.mainCardPhase}>{currentContent.title}</Text>
          <Text style={styles.mainCardMessage}>{currentContent.msg}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 40 }} />

      {/* 3. Cycle Info (Vertical) */}
      <View style={styles.cycleInfoSection}>
        <Text style={styles.cycleInfoText}>
          {t('dashboard.cycle_day', { day: cycleInfo?.cycleDay || 1 })}
        </Text>
        <Text style={styles.cycleInfoTextSecondary}>
          {t('dashboard.next_period', { days: cycleInfo?.daysUntilNextPeriod || 28 })}
        </Text>
      </View>

      <View style={{ marginBottom: 48 }} />

      {/* 4. Main Action Only */}
      <Pressable 
        style={styles.mainActionButton} 
        onPress={() => onNavigate('dailyLog')}
      >
        <Text style={styles.mainActionText}>{t('dashboard.main_action')}</Text>
      </Pressable>

      <View style={{ height: 160 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Soft almond/calm background
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
  },
  mainCard: {
    width: '100%',
    height: 440,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  mainCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF9F6',
    opacity: 0.9,
  },
  mainCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  mainCardPhase: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: '#FFF',
    marginBottom: 12,
  },
  mainCardMessage: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    opacity: 0.95,
  },
  cycleInfoSection: {
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  cycleInfoText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 8,
  },
  cycleInfoTextSecondary: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.primary,
    opacity: 1,
  },
  mainActionButton: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  mainActionText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
