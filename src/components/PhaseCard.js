import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '../theme/colors';

export const PhaseCard = ({ phase, day, message }) => {
  const phaseStyles = getPhaseStyles(phase);
  
  return (
    <Pressable style={[styles.card, { backgroundColor: phaseStyles.background }]} activeOpacity={0.9}>
      <View style={styles.header}>
        <Text style={[styles.phaseLabel, { color: phaseStyles.text }]}>Día {day}</Text>
        <View style={[styles.badge, { backgroundColor: phaseStyles.accent }]}>
           <Text style={styles.badgeText}>{phase.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: phaseStyles.text }]}>{phaseStyles.title}</Text>
      <Text style={[styles.message, { color: phaseStyles.textSecondary }]}>{message}</Text>
    </Pressable>
  );
};

const getPhaseStyles = (phase) => {
  switch (phase.toLowerCase()) {
    case 'menstrual':
      return { 
        background: '#FFE0E0', 
        text: colors.on_surface, 
        textSecondary: '#665555',
        accent: colors.phases.menstrual,
        title: 'Calidez y Cuidado' 
      };
    case 'folicular':
      return { 
        background: colors.primary_container, 
        text: colors.primary, 
        textSecondary: colors.on_primary_container,
        accent: colors.phases.follicular,
        title: 'Energía Renovada' 
      };
    case 'ovulatoria':
      return { 
        background: '#F3E5F5', 
        text: '#4A148C', 
        textSecondary: '#6A1B9A',
        accent: colors.phases.ovulation,
        title: 'Vitalidad Plena' 
      };
    case 'lútea':
      return { 
        background: colors.secondary_container, 
        text: colors.secondary, 
        textSecondary: colors.on_secondary_container,
        accent: colors.phases.luteal,
        title: 'Reflexión y Calma' 
      };
    default:
      return { 
        background: colors.surface_container, 
        text: colors.on_surface, 
        textSecondary: colors.on_surface_variant,
        accent: colors.primary,
        title: 'Tu Ciclo' 
      };
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 24,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    boxShadow: `0px 4px 12px ${colors.primary}0D`, // 0D is ~0.05 alpha
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  phaseLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#FFF',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    lineHeight: 22,
  }
});
