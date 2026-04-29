import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Image,
  ImageBackground,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useClerk } from '@clerk/clerk-expo';
import {
  User,
  Bell,
  Shield,
  CircleHelp,
  LogOut,
  ChevronRight,
  Camera,
  CreditCard,
  Globe,
  Database,
  ChevronLeft,
  CircleHelp as InfoIcon,
  Crown,
  Lock,
} from 'lucide-react-native';

import { colors } from '../theme/colors';

const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';

export const SettingsScreen = ({ onBack, onLogout, onNavigate, user, currentPhaseKey = 'follicular', cycleInfo, isAdmin, isPremium }) => {
  const { t, i18n } = useTranslation();
  const [notifs, setNotifs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const isSpanish = currentLanguage?.toLowerCase().startsWith('es');

  const toggleLanguage = () => {
    const nextLang = isSpanish ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
  };

  const fullName = user?.fullName || user?.firstName || t('common.user_fallback');
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    t('settings.no_email_connected');

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        const asset = result.assets[0];
        
        // Prepare base64 for Clerk
        const base64 = asset.base64.startsWith('data:') 
          ? asset.base64 
          : `data:image/jpeg;base64,${asset.base64}`;

        await user.setProfileImage({ file: base64 });
        Alert.alert(t('common.success'), t('settings.profile_image_updated'));
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert(t('settings.error'), t('settings.profile_image_error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAction = (title) => {
    if (title === t('settings.export')) {
      Alert.alert(
        t('settings.export'),
        t('settings.export_desc')
      );
    } else {
      Alert.alert(title, t('settings.profile_connected', { title }));
    }
  };

  const clerk = useClerk();

  const handleChangePassword = async () => {
    console.log('[Settings] Change Password clicked');
    if (!user || !user.primaryEmailAddress) {
      Alert.alert(t('settings.error'), t('settings.no_primary_email'));
      return;
    }
    
    // Check if user has a password (not a social login)
    const hasPassword = user.passwordEnabled;
    if (!hasPassword) {
      Alert.alert(
        t('settings.social_login'),
        t('settings.social_login_desc')
      );
      return;
    }

    if (Platform.OS === 'web') {
      setShowPassForm(true);
      return;
    }

    Alert.alert(
      t('settings.change_password'),
      t('settings.reset_email_confirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        { text: t('common.ok'), onPress: () => setShowPassForm(true) }
      ]
    );
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert(t('settings.error'), t('settings.password_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('settings.error'), t('settings.password_mismatch'));
      return;
    }

    try {
      await user.update({ password: newPassword });
      Alert.alert(t('common.success'), t('settings.password_updated'));
      setShowPassForm(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert(t('settings.error'), err.errors?.[0]?.message || t('settings.password_update_failed'));
    }
  };

  const SettingRow = ({ icon: Icon, title, sub, type = 'chevron', value, onValueChange, onPress }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.settingRow,
        pressed && { backgroundColor: 'rgba(0,0,0,0.05)' }
      ]} 
      onPress={() => {
        console.log(`[Settings] Row clicked: ${title}`);
        if (onPress) onPress();
        else handleAction(title);
      }}
      hitSlop={20}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Icon size={20} color={colors.on_surface_variant} strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
      </View>
      {type === 'chevron' ? (
        <ChevronRight size={18} color="#CBD5E1" />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E2E8F0', true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerHero}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1545208393-596371BA9a3f?w=800&q=80' }} // Calm wellness/lifestyle
            style={styles.heroBg}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.topNav}>
              <Pressable onPress={onBack} style={styles.backCircle}>
                <ChevronLeft size={24} color="#FFF" />
              </Pressable>
              <Pressable style={styles.navRight} onPress={() => onNavigate('subscription')}>
                <View style={styles.premiumPill}>
                  <Crown size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.premiumText}>BALANCE</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.profileMaster}>
              <View style={styles.avatarMaster}>
                <Image source={{ uri: user?.imageUrl || fallbackAvatar }} style={styles.avatarMain} />
                <Pressable
                  style={[styles.editBadge, isUploading && { opacity: 0.5 }]}
                  onPress={pickImage}
                  disabled={isUploading}
                >
                  <Camera size={14} color="#FFF" />
                </Pressable>
              </View>
              <Text style={styles.masterName}>{fullName}</Text>
              <Text style={styles.masterEmail}>{email}</Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.mainGroup}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('profile.today') || 'Hoy'}</Text>
              <Text style={styles.summaryValue}>{t('common.day')} {cycleInfo?.cycleDay || 1}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('profile.next_period') || 'Para tu próximo periodo'}</Text>
              <Text style={styles.summaryValue}>{cycleInfo?.daysUntilNextPeriod ?? 0} {t('common.days')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('profile.current_phase')}</Text>
              <Text style={styles.summaryValue}>{t(`phases.${currentPhaseKey}`)}</Text>
            </View>
          </View>

          {showPassForm && (
            <View style={styles.passwordForm}>
              <Text style={styles.formTitle}>{t('settings.update_password')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Nueva Contraseña"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmar Contraseña"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <View style={styles.formButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowPassForm(false)}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleUpdatePassword}>
                  <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.sectionArea}>
            <Text style={styles.areaTitle}>{t('settings.profile').toUpperCase()}</Text>
            <View style={styles.groupOutline}>
              <SettingRow icon={User} title={t('settings.profile')} sub={t('settings.profile_sub')} onPress={() => onNavigate('editProfile')} />
              <SettingRow icon={Bell} title={t('settings.notifications')} sub={t('settings.notif_sub')} type="switch" value={notifs} onValueChange={setNotifs} />
              <SettingRow 
                icon={Globe} 
                title={t('settings.language')} 
                sub={isSpanish ? t('settings.spanish') : t('settings.english')} 
                onPress={toggleLanguage}
              />
              {isAdmin && (
                <SettingRow
                  icon={Shield}
                  title={t('settings.admin')}
                  sub={t('settings.admin_sub')}
                  onPress={() => onNavigate('admin')}
                />
              )}
            </View>
          </View>

          <View style={[styles.sectionArea, { marginTop: 24 }]}>
            <Text style={styles.areaTitle}>{t('settings.security_title').toUpperCase()}</Text>
            <View style={styles.groupOutline}>
              <SettingRow 
                icon={Lock} 
                title={t('settings.change_password')} 
                sub={t('settings.security_sub')} 
                onPress={handleChangePassword} 
              />
              <SettingRow 
                icon={CreditCard} 
                title={t('settings.subscription')} 
                sub={isPremium ? t('settings.active_subscription') : t('settings.upgrade_to_elite')} 
                onPress={() => onNavigate('subscription')} 
              />
            </View>
          </View>

          <View style={styles.supportStrip}>
            <Pressable style={styles.supportTap} onPress={() => handleAction(t('settings.help'))}>
              <CircleHelp size={18} color={colors.on_surface_variant} />
              <Text style={styles.supportTapText}>{t('settings.help')}</Text>
            </Pressable>
            <Pressable style={styles.supportTap} onPress={() => handleAction(t('settings.about'))}>
              <InfoIcon size={18} color={colors.on_surface_variant} />
              <Text style={styles.supportTapText}>{t('settings.about')}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.logoutRow} onPress={onLogout} hitSlop={10}>
            <LogOut size={20} color="#EB5757" />
            <Text style={styles.logoutRowText}>{t('settings.logout')}</Text>
          </Pressable>
        </View>

        <View style={{ height: 180 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    backgroundColor: colors.background,
  },
  headerHero: {
    height: 380,
    width: '100%',
  },
  heroBg: {
    flex: 1,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,68,83,0.6)',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navRight: {
    flexDirection: 'row',
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  goldPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    marginRight: 10,
  },
  premiumText: {
    color: '#FFD700',
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    marginLeft: 6,
    letterSpacing: 2,
  },
  profileMaster: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarMaster: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  avatarMain: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4A4453',
  },
  masterName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  masterEmail: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  mainGroup: {
    marginTop: -40,
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 32,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F1F1E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  summaryItem: {
    paddingVertical: 12,
  },
  summaryLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: '#A3B3A5', // Sage Green
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    opacity: 0.8,
  },
  summaryValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F1E8',
    marginVertical: 12,
  },
  sectionArea: {
    marginBottom: 8,
  },
  areaTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.on_surface_variant,
    letterSpacing: 2,
    marginBottom: 20,
    marginLeft: 4,
    opacity: 0.6,
  },
  groupOutline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    cursor: 'pointer', // Force pointer on web
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.on_surface,
  },
  rowSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginTop: 1,
  },
  supportStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  supportTap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  supportTapText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.on_surface_variant,
    marginLeft: 8,
  },
  logoutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF2F2',
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  logoutRowText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#EB5757',
  },
  passwordForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary_container,
  },
  formTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surface_container_lowest,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontFamily: 'Outfit_500Medium',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  cancelBtnText: {
    fontFamily: 'Outfit_700Bold',
    color: colors.on_surface_variant,
  },
  saveBtnText: {
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
});
