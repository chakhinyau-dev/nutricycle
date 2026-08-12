import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'nutricycle_onboarding_complete';

const profileKey = (userId) => `nutricycle_profile_${userId}`;
const dailyLogsKey = (userId) => `nutricycle_daily_logs_${userId}`;
const cycleWizardKey = (userId) => `nutricycle_cycle_wizard_seen_${userId}`;

const isWeb = Platform.OS === 'web';

const getItem = async (key) => {
  if (isWeb) {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return await SecureStore.getItemAsync(key);
};

const setItem = async (key, value) => {
  if (isWeb) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const removeItem = async (key) => {
  if (isWeb) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const getOnboardingComplete = async () => {
  const value = await getItem(ONBOARDING_KEY);
  return value === 'true';
};

export const setOnboardingComplete = async (value) => {
  await setItem(ONBOARDING_KEY, value ? 'true' : 'false');
};

export const getLocalProfile = async (userId) => {
  if (!userId) {
    return null;
  }

  const rawValue = await getItem(profileKey(userId));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
};

export const setLocalProfile = async (userId, profile) => {
  if (!userId) {
    return;
  }

  await setItem(profileKey(userId), JSON.stringify(profile));
};

export const getCycleWizardSeen = async (userId) => {
  if (!userId) {
    return false;
  }

  const value = await getItem(cycleWizardKey(userId));
  return value === 'true';
};

export const setCycleWizardSeen = async (userId, value) => {
  if (!userId) {
    return;
  }

  await setItem(cycleWizardKey(userId), value ? 'true' : 'false');
};

export const getLocalDailyLogs = async (userId) => {
  if (!userId) {
    return [];
  }

  const rawValue = await getItem(dailyLogsKey(userId));

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const setLocalDailyLogs = async (userId, logs) => {
  if (!userId) {
    return;
  }

  await setItem(dailyLogsKey(userId), JSON.stringify(logs));
};

const aiPredictionKey = (userId) => `nutricycle_ai_pred_${userId}`;

export const getAIPrediction = async (userId) => {
  if (!userId) return null;
  const raw = await getItem(aiPredictionKey(userId));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const today = new Date().toDateString();
    // Only valid for the same day
    if (data.date === today) {
      return data.text;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const setAIPrediction = async (userId, text) => {
  if (!userId || !text) return;
  const data = {
    text,
    date: new Date().toDateString(),
  };
  await setItem(aiPredictionKey(userId), JSON.stringify(data));
};

/**
 * Wipes every locally-cached value tied to this user (profile, daily logs,
 * cycle wizard flag, cached AI prediction). Used by the "Delete Account" flow
 * so nothing lingers on-device after the account itself is gone.
 */
export const clearLocalUserData = async (userId) => {
  if (!userId) return;
  await Promise.all([
    removeItem(profileKey(userId)),
    removeItem(dailyLogsKey(userId)),
    removeItem(cycleWizardKey(userId)),
    removeItem(aiPredictionKey(userId)),
  ]);
};
