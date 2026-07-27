import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Image,
  ScrollView, 
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { 
  ChevronLeft, 
  Moon, 
  Wind, 
  ShieldCheck, 
  Brain, 
  Flame,
  ArrowRight,
  Activity,
  X,
  Play
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const WellnessScreen = ({ onBack }) => {
  const { t } = useTranslation();
  const [playingActivity, setPlayingActivity] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const categories = [
    { id: 'mind', name: t('wellness.categories.mind'), icon: <Brain size={20} color={colors.primary} /> },
    { id: 'body', name: t('wellness.categories.body'), icon: <Flame size={20} color="#F59E0B" /> },
    { id: 'sleep', name: t('wellness.categories.sleep'), icon: <Moon size={20} color="#6366F1" /> },
  ];

  const activities = [
    { 
      id: 1, 
      title: t('wellness.act1_title'), 
      tag: t('wellness.tags.calm'), 
      time: '05 min', 
      icon: <Wind size={24} color={colors.primary} />,
      bg: '#F3E8FF',
      description: t('wellness.act1_desc'),
    },
    { 
      id: 2, 
      title: t('wellness.act2_title'), 
      tag: t('wellness.tags.relief'), 
      time: '15 min', 
      icon: <Activity size={24} color="#F59E0B" />, 
      bg: '#FFF7ED',
      description: t('wellness.act2_desc'),
    },
  ];

  const handleSetPlaying = (activity) => {
    setPlayingActivity(activity);
    const mins = parseInt(activity.time || '10');
    setTimeLeft(mins * 60);
    setTimerActive(true);
  };

  const handleClose = () => {
    setPlayingActivity(null);
    setTimerActive(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>{t('wellness.title')}</Text>
        </View>

        <View style={styles.heroCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' }} 
            style={styles.heroBg}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.shieldIcon}>
                <ShieldCheck size={20} color="#FFF" />
              </View>
              <Text style={styles.heroTag}>{t('wellness.hero_tag')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('wellness.hero_title')}</Text>
            <Pressable 
              style={styles.heroBtn}
              onPress={() => handleSetPlaying({ 
                title: t('wellness.hero_title'), 
                tag: t('wellness.tags.calm'),
                time: '10 min', 
                description: t('wellness.hero_desc'),
                youtubeId: 'GdTEDblpPxY'
              })}
            >
              <Text style={styles.heroBtnText}>{t('wellness.hero_cta')}</Text>
              <ArrowRight size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <Pressable key={cat.id} style={styles.categoryPill}>
              {cat.icon}
              <Text style={styles.categoryLabel}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('wellness.suggestions_title')}</Text>
        </View>

        {activities.map((item) => (
          <Pressable 
            key={item.id} 
            style={styles.activityCard}
            onPress={() => handleSetPlaying(item)}
          >
            <View style={[styles.activityIconCircle, { backgroundColor: item.bg }]}>
              {item.icon}
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTag}>{item.tag}</Text>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.activityTime}>{item.time}</Text>
                <Text style={styles.bulletSeparator}> • </Text>
                <Text style={styles.activityTime}>{t('common.all')}</Text>
              </View>
            </View>
            <View style={styles.playButton}>
               <Play size={18} color={colors.primary} fill={colors.primary} />
            </View>
          </Pressable>
        ))}

        <View style={styles.sleepPreview}>
          <View style={styles.sleepHead}>
            <Text style={styles.sleepTitle}>{t('wellness.sleep_quality')}</Text>
            <Text style={styles.sleepValue}>86%</Text>
          </View>
          <View style={[styles.progressTrack, { height: 8 }]}>
             <View style={[styles.progressFill, { width: '86%', height: 8 }]} />
          </View>
          <Text style={styles.sleepDesc}>{t('wellness.sleep_desc')}</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={!!playingActivity} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
           <View style={styles.playerCard}>
              <Pressable style={styles.closeModal} onPress={handleClose}>
                <X size={24} color={colors.on_surface_variant} />
              </Pressable>
              
              <View style={styles.playerHeader}>
                <Text style={styles.playingTag}>{t('wellness.playing_tag')}</Text>
                <Text style={styles.playingTitle}>{playingActivity?.title}</Text>
              </View>

              <View style={[styles.zenTimerArea, { height: (width - 64) * 0.8, width: width - 64 }]}>
                <View style={styles.zenOrbGlow} />
                <View style={styles.zenOrbInner} />
                <View style={styles.timerContent}>
                  <Text style={styles.timerValueLarge}>{formatTime(timeLeft)}</Text>
                  <Text style={styles.timerLabelSmall}>{t('wellness.remaining')}</Text>
                </View>
              </View>

              <View style={styles.playerInfo}>
                 <Text style={styles.playerDesc}>{playingActivity?.description}</Text>
              </View>

              <Pressable style={styles.stopBtn} onPress={handleClose}>
                <Text style={styles.stopBtnText}>{t('wellness.stop_session')}</Text>
              </Pressable>
           </View>
        </View>
      </Modal>
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
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 38,
  },
  heroCard: {
    width: '100%',
    height: 220,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  heroTag: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 34,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heroBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.primary,
    marginRight: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    width: (width - 60) / 3,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  categoryLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface,
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F4F4F4',
  },
  activityIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityTag: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  activityTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.on_surface,
    marginBottom: 2,
  },
  activityTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
  },
  bulletSeparator: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginHorizontal: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepPreview: {
    backgroundColor: colors.on_surface,
    borderRadius: 36,
    padding: 32,
    marginTop: 16,
  },
  sleepHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sleepTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
  },
  sleepValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sleepDesc: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 32,
    alignItems: 'center',
    paddingBottom: 60,
  },
  closeModal: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  playerHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  playingTag: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  playingTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    textAlign: 'center',
  },
  zenTimerArea: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#0F172A', // Deep space blue for Zen mode
  },
  zenOrbGlow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.15,
    position: 'absolute',
  },
  zenOrbInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.3,
    position: 'absolute',
  },
  timerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  timerValueLarge: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 64,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  timerLabelSmall: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    marginTop: -4,
  },
  playerInfo: {
    paddingHorizontal: 20,
    marginVertical: 32,
    alignItems: 'center',
  },
  playerDesc: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 22,
  },
  stopBtn: {
    width: '100%',
    height: 72,
    backgroundColor: '#FFF1F2',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FF4D4D',
    letterSpacing: 1,
  },
});
