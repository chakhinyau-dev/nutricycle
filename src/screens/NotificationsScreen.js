import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { colors } from '../theme/colors';
import {
  ChevronLeft,
  Gift,
  CircleHelp,
  Heart,
  CheckCheck,
  Zap,
  Clock,
  Settings,
  Bookmark,
} from 'lucide-react-native';
import { loadDailyLogs } from '../services/dailyLogService';
import { buildNotifications } from '../utils/notifications';

const iconMap = {
  phase: <CircleHelp size={20} color={colors.primary} />,
  recipe: <Gift size={20} color="#F59E0B" />,
  cycle: <Heart size={20} color="#EF4444" />,
  log: <Zap size={20} color="#6366F1" />,
};

export const NotificationsScreen = ({ onBack, onNavigate, cycleInfo, recipes }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [logs, setLogs] = useState([]);
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!user?.id) {
        return;
      }

      const history = await loadDailyLogs(getToken, user.id);

      if (mounted) {
        setLogs(history);
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [getToken, user?.id]);

  const notifications = useMemo(
    () =>
      buildNotifications({
        cycleInfo,
        recipes,
        logs,
      }),
    [cycleInfo, logs, recipes]
  );

  const unreadCount = notifications.filter((item) => item.isNew && !readIds.includes(item.id)).length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.on_surface} />
          </Pressable>
          <Text style={styles.title}>Centro de{'\n'}notificaciones</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.settingsBtn} onPress={() => onNavigate('saveDetail')}>
            <Bookmark size={24} color={colors.on_surface_variant} />
          </Pressable>
          <Pressable style={[styles.settingsBtn, { marginLeft: 12 }]}>
            <Settings size={24} color={colors.on_surface_variant} />
          </Pressable>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{unreadCount} NUEVAS</Text>
        </View>
        <Pressable style={styles.markReadBtn} onPress={() => setReadIds(notifications.map((item) => item.id))}>
          <CheckCheck size={16} color={colors.primary} />
          <Text style={styles.markReadText}>Marcar como leídas</Text>
        </Pressable>
      </View>

      <View style={styles.notifGroup}>
        <Text style={styles.groupTitle}>Recientes</Text>
        {notifications.map((notif) => {
          const isUnread = notif.isNew && !readIds.includes(notif.id);

          return (
            <Pressable
              key={notif.id}
              style={[styles.notifCard, isUnread && styles.notifCardNew]}
              onPress={() => {
                setReadIds((current) => [...new Set([...current, notif.id])]);
                Alert.alert(notif.title, notif.message);
              }}
            >
              <View style={styles.notifLayout}>
                <View style={[styles.iconCircle, { backgroundColor: isUnread ? '#FFFFFF' : '#F1F5F9' }]}>
                  {iconMap[notif.type] || iconMap.phase}
                </View>
                <View style={styles.textContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    {isUnread && <View style={styles.newDot} />}
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={3}>
                    {notif.message}
                  </Text>
                  <View style={styles.timeRow}>
                    <Clock size={12} color="#94A3B8" />
                    <Text style={styles.notifTime}>{notif.time}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
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
    elevation: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 38,
  },
  settingsBtn: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  statusBadge: {
    backgroundColor: colors.primary_container,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
  },
  notifGroup: {
    marginBottom: 40,
  },
  groupTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.on_surface,
    marginBottom: 20,
  },
  notifCard: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    marginBottom: 20,
  },
  notifCardNew: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notifLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.on_surface,
    flex: 1,
    paddingRight: 8,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifMessage: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    lineHeight: 20,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTime: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
});
