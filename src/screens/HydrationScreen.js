import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { 
  ChevronLeft, 
  Droplets, 
  Plus, 
  Minus, 
  Zap, 
  Waves, 
  CircleHelp,
  GlassWater,
  CupSoda,
  Beer
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const HydrationScreen = ({ onBack }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(1250);
  const goal = 2500;
  const progress = (amount / goal) * 100;

  const quickAdds = [
    { id: 250, name: t('hydration.containers.glass'), size: '250ml', icon: <GlassWater size={20} color={colors.primary} /> },
    { id: 500, name: t('hydration.containers.bottle'), size: '500ml', icon: <CupSoda size={20} color={colors.primary} /> },
    { id: 1000, name: t('hydration.containers.thermos'), size: '1L', icon: <Droplets size={20} color={colors.primary} /> },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.title}>{t('hydration.title')}</Text>
      </View>

      <View style={styles.mainCard}>
        <View style={styles.progressCircle}>
           <View style={styles.circleBg}>
              <View style={[styles.waveFill, { height: `${progress}%` }]} />
              <View style={styles.circleContent}>
                <Droplets size={44} color={progress > 50 ? colors.on_primary : colors.primary} />
                <Text style={[styles.percentageText, { color: progress > 60 ? colors.on_primary : colors.on_surface }]}>
                  {Math.round(progress)}%
                </Text>
                <Text style={[styles.goalSubText, { color: progress > 70 ? colors.on_primary : colors.on_surface_variant }]}>
                  {amount} / {goal} ml
                </Text>
              </View>
           </View>
        </View>

        <View style={styles.counterRow}>
          <Pressable 
            style={styles.counterBtn}
            onPress={() => setAmount(Math.max(0, amount - 50))}
          >
            <Minus size={24} color={colors.on_surface} />
          </Pressable>
          <View style={styles.counterTextGroup}>
            <Text style={styles.mainAmount}>{amount / 1000}L</Text>
            <Text style={styles.amountLabel}>{t('hydration.total_consumption')}</Text>
          </View>
          <Pressable 
            style={styles.counterBtn}
            onPress={() => setAmount(amount + 50)}
          >
            <Plus size={24} color={colors.on_surface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('hydration.quick_add')}</Text>
      </View>

      <View style={styles.quickAddGrid}>
        {quickAdds.map((item) => (
          <Pressable 
            key={item.id} 
            style={styles.quickAddCard}
            onPress={() => setAmount(amount + item.id)}
          >
            <View style={styles.quickIconCircle}>
              {item.icon}
            </View>
            <Text style={styles.quickName}>{item.name}</Text>
            <Text style={styles.quickSize}>{item.size}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.insightBox}>
        <View style={styles.insightHeader}>
          <Zap size={20} color={colors.primary} fill={colors.primary} />
          <Text style={styles.insightTag}>{t('hydration.tip_title')}</Text>
        </View>
        <Text style={styles.insightText}>
          {t('hydration.tip_desc')}
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
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
    width: 44,    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 38,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  progressCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F1F5F9',
    padding: 8,
    marginBottom: 32,
  },
  circleBg: {
    flex: 1,
    borderRadius: 102,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
  },
  circleContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  percentageText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 48,
    color: colors.on_surface,
  },
  goalSubText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface_variant,
    letterSpacing: 0.5,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  counterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface_container,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterTextGroup: {
    alignItems: 'center',
  },
  mainAmount: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
  },
  amountLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: colors.on_surface_variant,
    letterSpacing: 2,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: colors.on_surface,
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  quickAddCard: {
    width: (width - 64) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface,
  },
  quickSize: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
  },
  insightBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTag: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  insightText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface,
    lineHeight: 22,
  }
});
