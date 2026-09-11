import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Service to handle local and push notifications for NutriCycle.
 */

// Configure behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

export const scheduleCycleReminder = async (phaseName, daysLeft) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Primary reminder: phase transition
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "NutriCycle Reminder 🌸",
      body: `Your ${phaseName} phase is approaching. Get ready with some iron-rich foods!`,
      data: { screen: 'dashboard' },
    },
    trigger: {
      seconds: 3600 * 24 * (daysLeft - 1 > 0 ? daysLeft - 1 : 1), // 1 day before
    },
  });
};

export const sendAIReportNotification = async (reportText) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New AI Health Report 📊",
      body: `Your cycle analysis is ready: ${reportText.substring(0, 50)}...`,
      data: { report: reportText },
    },
    trigger: null, // Send immediately
  });
};

// Fasting Module: fires once, when the user's selected fast goal is reached.
// Scheduled relative to "now" (goalHours from the moment the fast starts),
// not tied to cycleReminder's cancelAllScheduledNotificationsAsync — starting
// or ending a fast must not wipe out an unrelated cycle-phase reminder.
export const scheduleFastingGoalNotification = async (goalHours) => {
  if (Platform.OS === 'web' || !goalHours) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meta de ayuno alcanzada ⏱️',
        body: `Completaste tus ${goalHours} horas de ayuno. ¡Buen trabajo!`,
        data: { screen: 'fasting' },
      },
      trigger: { seconds: Math.max(1, Math.round(goalHours * 3600)) },
    });
  } catch (error) {
    console.error('[Notifications] Error scheduling fasting goal notification:', error);
    return null;
  }
};

export const cancelFastingGoalNotification = async (notificationId) => {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    // Already fired or never scheduled — nothing to clean up.
  }
};

export const scheduleDailyHydrationReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Stay Hydrated 💧",
      body: "Time to log your water intake to optimize your energy levels.",
    },
    trigger: {
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });
};
