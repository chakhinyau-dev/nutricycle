import React, { useEffect, useMemo, useState, useRef } from 'react';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, ActivityIndicator, Pressable, Text, Dimensions, Alert, Platform, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, useUser, useAuth, useClerk } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { Home, CircleDot, User, PlaySquare, Soup } from 'lucide-react-native';

import { configureRevenueCat, logoutRevenueCat } from './src/services/revenuecatService';
import { AppAlertProvider } from './src/components/AppAlertProvider';

import { colors } from './src/theme/colors';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HydrationScreen } from './src/screens/HydrationScreen';
import { WellnessScreen } from './src/screens/WellnessScreen';
import { DailyLogScreen } from './src/screens/DailyLogScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { ArticlesScreen } from './src/screens/ArticlesScreen';
import { WizardScreen } from './src/screens/WizardScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { SavedRecipesScreen } from './src/screens/SavedRecipesScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { PeriodCalculatorScreen } from './src/screens/PeriodCalculatorScreen';
import { VideosScreen } from './src/screens/VideosScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { KeyFoodsScreen } from './src/screens/KeyFoodsScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { AIChatScreen } from './src/screens/AIChatScreen';
import { MealAnalyzerScreen } from './src/screens/MealAnalyzerScreen';
import { MOCK_RECIPES } from './src/utils/mockData';
import { ARTICLE_LIBRARY } from './src/utils/articleData';
import { VIDEO_LIBRARY } from './src/utils/videoData';
import { DEFAULT_CYCLE_PROFILE, getCycleInsights, normalizeCycleProfile } from './src/utils/cycle';
import { env, getMissingRecommendedEnv, getMissingRequiredEnv } from './src/lib/env';
import {
  getLocalProfile,
  getOnboardingComplete,
  setLocalProfile,
  setOnboardingComplete,
  getCycleWizardSeen,
  setCycleWizardSeen,
  clearLocalUserData,
} from './src/services/appStorage';
import { deleteUserAccountData } from './src/services/accountService';
import { loadUserProfile, saveUserProfile } from './src/services/profileService';
import { loadDailyLogs, deleteDailyLog } from './src/services/dailyLogService';
import { loadRecipes } from './src/services/recipeService';
import { loadKeyFoods } from './src/services/keyFoodsService';
import { loadSavedRecipeIds, toggleSavedRecipeForUser } from './src/services/savedRecipeService';
import { loadArticles } from './src/services/articleService';
import { loadVideos } from './src/services/videoService';
import { requestNotificationPermissions } from './src/services/notificationService';
import { recordSubscription, loadUserSubscription } from './src/services/subscriptionService';

const { width } = Dimensions.get('window');

const mainTabs = ['today', 'calendar', 'nutrition', 'videos', 'profile'];

const tokenCache = {
  async getToken(key) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const LoadingScreen = ({ label }) => {
  const { t } = useTranslation();
  const displayLabel = label || t('loading.sys_init');
  return (
    <View style={styles.loadingContainer}>
      <Image 
        source={require('./assets/logo.png')} 
        style={styles.loadingLogo} 
        resizeMode="contain" 
      />
      <View style={{ height: 40 }} />
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>{displayLabel}</Text>
      <Text style={styles.loadingSub}>{t('loading.harmony_ia')}</Text>
    </View>
  );
};

const ConfigScreen = ({ missingRequired, missingRecommended }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.errorIcon}>
       <Text style={{ fontSize: 32 }}>🛠️</Text>
    </View>
    <Text style={styles.configTitle}>Backend Configuration Required</Text>
    <Text style={styles.configText}>Please add these environment variables before running the application:</Text>
    <View style={styles.missingBox}>
      {missingRequired.map((item) => (
        <Text key={item} style={styles.configItem}>
          • {item}
        </Text>
      ))}
    </View>
    {missingRecommended.length ? (
      <>
        <Text style={[styles.configText, { marginTop: 24 }]}>For Supabase connectivity:</Text>
        <View style={[styles.missingBox, { backgroundColor: '#F0F9FF' }]}>
          {missingRecommended.map((item) => (
            <Text key={item} style={[styles.configItem, { color: '#0369A1' }]}>
               • {item}
            </Text>
          ))}
        </View>
      </>
    ) : null}
  </View>
);

// Wraps every screen render — remounts (via key) on navigation, playing the entrance animation
const ScreenWrapper = ({ children, isPush }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(isPush ? 32 : 0)).current;
  const translateY = useRef(new Animated.Value(isPush ? 0 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }, { translateY }] }}>
      {children}
    </Animated.View>
  );
};

const AppShell = () => {
  const { isLoaded: authLoaded, isSignedIn: clerkIsSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();

  const [isDemoMode, setIsDemoMode] = useState(false);

  // Demo mode — activated when Apple reviewer logs in with demo@nutricycle.com / Demo1234!
  const BYPASS_CLERK = isDemoMode;
  const isSignedIn = BYPASS_CLERK ? true : clerkIsSignedIn;
  const user = BYPASS_CLERK ? {
    id: 'user_demo_apple_review',
    primaryEmailAddress: { emailAddress: 'demo@nutricycle.com' },
    fullName: 'Demo User',
    firstName: 'Demo',
    lastName: 'User',
    imageUrl: null,
    publicMetadata: { role: 'admin' },
  } : clerkUser;
  const { t, i18n } = useTranslation();

  const [onboardingReady, setOnboardingReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [wizardComplete, setWizardComplete] = useState(false);
  const [cycleProfile, setCycleProfile] = useState(DEFAULT_CYCLE_PROFILE);
  const [recipes, setRecipes] = useState(MOCK_RECIPES);
  const [savedRecipeIds, setSavedRecipeIds] = useState([]);
  const [articles, setArticles] = useState(ARTICLE_LIBRARY);
  const [videos, setVideos] = useState(VIDEO_LIBRARY);
  const [keyFoods, setKeyFoods] = useState({});
  const [dailyLogs, setDailyLogs] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [activeTab, setActiveTab] = useState('today');
  const [screenStack, setScreenStack] = useState([]);
  const [navigationParams, setNavigationParams] = useState({});
  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type }), 3000);
  };

  const cycleInfo = useMemo(() => getCycleInsights(cycleProfile), [cycleProfile]);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      const [onboardingComplete, demoFlag] = await Promise.all([
        getOnboardingComplete(),
        AsyncStorage.getItem('nutricycle_demo_mode'),
      ]);

      if (!isMounted) return;

      if (demoFlag === 'true') {
        setIsDemoMode(true);
        setHasCompletedOnboarding(true);
      } else {
        setHasCompletedOnboarding(onboardingComplete);
      }

      setOnboardingReady(true);
      requestNotificationPermissions();
    };

    boot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapUserData = async () => {
      if (!authLoaded || !user?.id) {
        return;
      }

      // Previously nothing below this point was wrapped in a try/catch, so
      // a single failed call anywhere in this chain (network hiccup, an RLS
      // edge case, etc.) left profileLoading stuck at true forever — an
      // infinite loading spinner even though sign-in itself had already
      // succeeded. Apple App Review hit exactly this: "activity indicator
      // spun indefinitely after we attempted to log in with Sign in with
      // Apple." The try/finally here guarantees setProfileLoading(false)
      // always runs, success or failure.
      setProfileLoading(true);
      try {
        // Initialize RevenueCat with the current user ID
        await configureRevenueCat(user.id);

        // Demo mode: skip all Supabase calls and use a pre-filled profile
        if (isDemoMode) {
          const d = new Date();
          d.setDate(d.getDate() - 8);
          const demoLastPeriod = d.toISOString().split('T')[0];
          setCycleProfile({
            currentPhase: 'follicular',
            cycleLength: 28,
            periodLength: 5,
            lastPeriodStart: demoLastPeriod,
            isPremium: true,
            is_premium: true,
            goal: 'balance',
          });
          setWizardComplete(true);
          return;
        }

        const [localProfile, hasSeenCycleWizard] = await Promise.all([
          getLocalProfile(user.id),
          getCycleWizardSeen(user.id),
        ]);
        const normalizedLocalProfile = normalizeCycleProfile(localProfile || {});

        if (isMounted && localProfile) {
          const localWizardComplete = Boolean(localProfile.wizardComplete);
          setWizardComplete(localWizardComplete || hasSeenCycleWizard);
          setCycleProfile(normalizedLocalProfile);
          if (localWizardComplete && !hasSeenCycleWizard) {
            await setCycleWizardSeen(user.id, true);
          }
        }

        const [profileResult, recipeResult, savedIdsResult, subResult] = await Promise.all([
          loadUserProfile(getToken, user.id),
          loadRecipes(getToken),
          loadSavedRecipeIds(getToken, user.id),
          loadUserSubscription(getToken, user.id)
        ]);

        const [articlesResult, videosResult, keyFoodsResult] = await Promise.all([
          loadArticles(getToken),
          loadVideos(getToken),
          loadKeyFoods(getToken),
        ]);

        if (!isMounted) {
          return;
        }

        setRecipes(recipeResult || MOCK_RECIPES);
        setSavedRecipeIds(savedIdsResult || []);
        setArticles(articlesResult || ARTICLE_LIBRARY);
        setVideos(videosResult || VIDEO_LIBRARY);
        if (keyFoodsResult) setKeyFoods(keyFoodsResult);
        setSubscription(subResult);

        // If subscription is expired, override is_premium to false so access is revoked
        const effectiveIsPremium =
          profileResult?.is_premium &&
          (subResult === null || subResult?.is_active !== false);
        const adjustedProfile = profileResult
          ? { ...profileResult, is_premium: effectiveIsPremium }
          : profileResult;

        if (adjustedProfile?.current_phase) {
          const normalizedRemoteProfile = normalizeCycleProfile(adjustedProfile);
          setCycleProfile(normalizedRemoteProfile);
          setWizardComplete(hasSeenCycleWizard);

          const logs = await loadDailyLogs(getToken, user.id);
          setDailyLogs(logs || []);

          await setLocalProfile(user.id, {
            ...normalizedRemoteProfile,
            wizardComplete: true,
          });
        } else if (!localProfile) {
          setWizardComplete(false);
          setCycleProfile(DEFAULT_CYCLE_PROFILE);
        }
      } catch (error) {
        console.error('[Bootstrap] Failed to load user data:', error);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    if (isSignedIn && user?.id) {
      bootstrapUserData();
      return () => {
        isMounted = false;
      };
    }

    setProfileLoading(false);
    setWizardComplete(false);
    setCycleProfile(DEFAULT_CYCLE_PROFILE);
    setRecipes(MOCK_RECIPES);
    setSavedRecipeIds([]);
    setArticles(ARTICLE_LIBRARY);
    setVideos(VIDEO_LIBRARY);
    setSubscription(null);

    return () => {
      isMounted = false;
    };
  }, [authLoaded, isSignedIn, user?.id]);


  const refreshAdminData = async () => {
    const [freshVideos, freshRecipes, freshFoods] = await Promise.all([
      loadVideos(getToken),
      loadRecipes(getToken),
      loadKeyFoods(getToken),
    ]);
    if (freshVideos) setVideos(freshVideos);
    if (freshRecipes) setRecipes(freshRecipes);
    if (freshFoods) setKeyFoods(freshFoods);
  };

  const refreshAIPredictionData = async () => {
    // AI Disabled
  };

  const handleDeleteLog = async (logId, logDate) => {
    if (!isSignedIn || !user?.id) return;
    
    // Optimistic UI update
    const previousLogs = [...dailyLogs];
    setDailyLogs(current => current.filter(l => l.id !== logId && l.log_date !== logDate));
    
    const success = await deleteDailyLog(getToken, user.id, logId, logDate);
    if (!success) {
      setDailyLogs(previousLogs);
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('dailylog.delete_error'));
    } else {
      showToast(t('dailylog.log_deleted'), 'success');
      refreshAIPredictionData();
    }
  };

  const navigateTo = (screen, params = null) => {
    if (mainTabs.includes(screen)) {
      setActiveTab(screen);
      setScreenStack([]);
      setNavigationParams({});
      return;
    }

    setScreenStack((current) => [...current, screen]);
    setNavigationParams((current) => ({
      ...current,
      [screen]: params,
    }));
  };

  const goBack = () => {
    setScreenStack((current) => current.slice(0, -1));
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    setScreenStack([]);
  };

  const handleFinishOnboarding = async () => {
    await setOnboardingComplete(true);
    setHasCompletedOnboarding(true);
  };

  const persistProfile = async (profileInput) => {
    const normalizedProfile = normalizeCycleProfile(profileInput);
    const derivedCycleInfo = getCycleInsights(normalizedProfile);

    setCycleProfile(normalizedProfile);
    setWizardComplete(true);

    if (user?.id) {
      await setLocalProfile(user.id, {
        ...normalizedProfile,
        wizardComplete: true,
      });

      await saveUserProfile(getToken, {
        clerk_user_id: user.id,
        email:
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          '',
        full_name: user.fullName || user.firstName || '',
        current_phase: derivedCycleInfo.currentPhaseKey,
        cycle_length: normalizedProfile.cycleLength,
        period_length: normalizedProfile.periodLength,
        last_period_start: normalizedProfile.lastPeriodStart,
        is_premium: normalizedProfile.isPremium,
      });
    }

    return normalizedProfile;
  };

  const handleUpgrade = async (upgradeData = 'annual') => {
    if (!user?.id) return;

    const normalizePlanKey = (value) => {
      const text = String(value || '').toLowerCase();
      if (text.includes('monthly')) return 'monthly';
      if (text.includes('annual') || text.includes('yearly')) return 'annual';
      return 'annual';
    };

    const resolvedPlanKey = typeof upgradeData === 'string'
      ? normalizePlanKey(upgradeData)
      : normalizePlanKey(upgradeData?.planKey || 'annual');
    const resolvedPlanType = typeof upgradeData === 'string'
      ? (resolvedPlanKey === 'annual' ? 'yearly' : 'monthly')
      : upgradeData?.planType || (resolvedPlanKey === 'annual' ? 'yearly' : 'monthly');
    const currentPeriodEnd = typeof upgradeData === 'object' && upgradeData?.currentPeriodEnd
      ? upgradeData.currentPeriodEnd
      : new Date(Date.now() + (resolvedPlanType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    const newProfile = {
      ...cycleProfile,
      isPremium: true,
    };

    // Callers (SubscriptionScreen's handleCheckout/handleRestore) await this
    // function now, so errors here must be caught and surfaced — otherwise a
    // failed write after a real purchase fails completely silently, and the
    // caller's `finally` block still resets its loading state as if nothing
    // went wrong.
    try {
      await persistProfile(newProfile);

      // Record in the subscriptions table
      const recordedSub = await recordSubscription(getToken, user.id, {
          status: upgradeData?.status || 'active',
          plan_type: resolvedPlanType,
          stripe_customer_id: typeof upgradeData === 'object' ? upgradeData?.stripeCustomerId || upgradeData?.customer || '' : '',
          stripe_subscription_id: typeof upgradeData === 'object' ? upgradeData?.stripeSubscriptionId || upgradeData?.subscriptionId || '' : '',
          current_period_end: currentPeriodEnd
      });

      if (recordedSub) {
        setSubscription(recordedSub);
      }

      Alert.alert(
        t('subscription.success_title'),
        t('subscription.success_msg'),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[Upgrade] Failed to record subscription:', error);
      Alert.alert(
        t('settings.error'),
        t('subscription.payment_session_error')
      );
    }
  };

  const handleToggleSavedRecipe = async (recipe) => {
    if (!user?.id || !recipe?.id) {
      return { success: false, isSaved: false };
    }

    const recipeId = String(recipe.id);
    const currentIds = savedRecipeIds;
    const isSaved = currentIds.includes(recipeId);
    const optimisticIds = isSaved ? currentIds.filter((id) => id !== recipeId) : [...currentIds, recipeId];

    setSavedRecipeIds(optimisticIds);

    const succeeded = await toggleSavedRecipeForUser(getToken, user.id, recipeId, isSaved);

    if (!succeeded) {
      setSavedRecipeIds(currentIds);
      return { success: false, isSaved };
    }

    return { success: true, isSaved: !isSaved };
  };

  const handleFinishWizard = async (profileInput) => {
    await persistProfile(profileInput);
    if (user?.id) {
      await setCycleWizardSeen(user.id, true);
    }
  };

  const handleProfileSave = async (profileInput) => {
    await persistProfile(profileInput);
    goBack();
  };

  const handleDemoLogin = async () => {
    await AsyncStorage.setItem('nutricycle_demo_mode', 'true');
    setIsDemoMode(true);
    setHasCompletedOnboarding(true);
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      await AsyncStorage.removeItem('nutricycle_demo_mode');
      setIsDemoMode(false);
      setWizardComplete(false);
      setCycleProfile({
        currentPhase: 'follicular',
        cycleLength: 28,
        periodLength: 5,
        lastPeriodStart: new Date().toISOString().split('T')[0],
        isPremium: false,
        is_premium: false,
        goal: 'balance',
      });
    } else {
      await signOut();
    }
    setActiveTab('today');
    setScreenStack([]);
    setNavigationParams({});
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    // Demo/App-review account has nothing stored server-side — just exit demo mode.
    if (isDemoMode) {
      await handleLogout();
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { success } = await deleteUserAccountData(getToken, user.id);
      await clearLocalUserData(user.id);
      await logoutRevenueCat();

      if (!success) {
        // Some rows may not have been removed (e.g. an RLS policy blocked one
        // table) — surface this instead of silently deleting the login itself
        // and leaving orphaned data with no way for the user to try again.
        throw new Error('Some account data could not be deleted');
      }

      await user.delete();
      // Clerk destroys the session; the isSignedIn effect above resets all
      // app state back to logged-out, same as a normal sign-out.
    } catch (error) {
      console.error('[Account Deletion] Failed:', error);
      Alert.alert(t('settings.error'), t('settings.delete_account_error'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = user.publicMetadata?.role;
    return (
      role === 'owner' ||
      role === 'admin'
    );
  }, [user]);

  const sharedScreenProps = useMemo(
    () => ({
      currentPhaseKey: cycleInfo.currentPhaseKey,
      cycleInfo,
      cycleProfile,
      recipes,
      savedRecipeIds,
      articles,
      videos,
      keyFoods,
      user,
      isAdmin,
      dailyLogs,
      onRefreshAI: () => {},
    }),
    [cycleInfo, cycleProfile, recipes, savedRecipeIds, articles, videos, keyFoods, user, isAdmin, dailyLogs]
  );

  const savedRecipes = useMemo(
    () => recipes.filter((recipe) => savedRecipeIds.includes(String(recipe.id))),
    [recipes, savedRecipeIds]
  );

  // When a `subscriptions` row exists, it's the freshest source of truth (it's what
  // recordSubscription() just wrote, or what bootstrapUserData() just loaded) — use it
  // directly rather than also requiring cycleProfile.isPremium to already agree, since
  // those two values are written by separate network calls and can momentarily (or
  // permanently, if one of the calls fails) disagree. When there's no subscription row
  // at all — legacy accounts, or premium granted via the admin toggle — fall back to
  // cycleProfile.isPremium instead of hard-locking the user out.
  const canAccessPremium = isAdmin || (
    subscription
      ? (subscription.is_active === true || subscription.status === 'active' || subscription.status === 'premium')
      : cycleProfile.isPremium
  );

  const renderMainContent = () => {
    if (screenStack.length > 0) {
      const topScreen = screenStack[screenStack.length - 1];
      switch (topScreen) {
        case 'hydration':
          return <HydrationScreen onBack={goBack} user={user} getToken={getToken} />;
        case 'wellness':
          return <WellnessScreen onBack={goBack} />;
        case 'articles':
          return <ArticlesScreen onBack={goBack} articles={articles} user={user} />;
        case 'dailyLog':
          return <DailyLogScreen onBack={goBack} onNavigate={navigateTo} {...sharedScreenProps} />;
        case 'periodCalculator':
          return <PeriodCalculatorScreen onBack={goBack} onSave={handleProfileSave} cycleProfile={cycleProfile} />;
        case 'notifications':
          return <NotificationsScreen onBack={goBack} onNavigate={navigateTo} {...sharedScreenProps} />;
        case 'settings':
          return <SettingsScreen onBack={goBack} onNavigate={navigateTo} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} isDeletingAccount={isDeletingAccount} isPremium={canAccessPremium} {...sharedScreenProps} />;
        case 'recipeDetail':
          return (
            <RecipeDetailScreen
              recipe={navigationParams.recipeDetail}
              onBack={goBack}
              isSaved={savedRecipeIds.includes(String(navigationParams.recipeDetail?.id))}
              onToggleSave={handleToggleSavedRecipe}
            />
          );
        case 'editProfile':
          return <EditProfileScreen onBack={goBack} onSave={handleProfileSave} cycleProfile={cycleProfile} user={user} />;
        case 'saveDetail':
          return <SavedRecipesScreen onBack={goBack} onNavigate={navigateTo} recipes={savedRecipes} />;
        case 'subscription':
          return (
            <SubscriptionScreen
              onBack={goBack}
              onUpgrade={handleUpgrade}
              isPremium={canAccessPremium}
              activePlan={subscription?.plan_id || (subscription?.plan_type)}
              user={user}
            />
          );
        case 'videos':
          return (
            <VideosScreen
              onBack={goBack}
              currentPhaseKey={cycleInfo.currentPhaseKey}
              videos={videos}
              recipes={recipes}
              isLocked={!canAccessPremium}
              onSubscribe={() => navigateTo('subscription')}
            />
          );
        case 'videoDetail':
          return (
            <VideosScreen
              onBack={goBack}
              currentPhaseKey={cycleInfo.currentPhaseKey}
              videos={videos}
              recipes={recipes}
              isLocked={!canAccessPremium}
              onSubscribe={() => navigateTo('subscription')}
              initialVideo={navigationParams.videoDetail}
            />
          );
        case 'admin':
          return (
            <AdminScreen
              onBack={goBack}
              videos={videos}
              recipes={recipes}
              keyFoods={keyFoods}
              onRefresh={refreshAdminData}
              isAdmin={isAdmin}
              user={user}
              isPremium={canAccessPremium}
              onTogglePremium={handleUpgrade}
              showToast={showToast}
              getToken={getToken}
            />
          );

        case 'recipes':
          return (
            <RecipesScreen
              onBack={goBack}
              onNavigate={navigateTo}
              user={user}
              recipes={recipes}
              currentPhaseKey={cycleInfo.currentPhaseKey}
              isLocked={!canAccessPremium}
              onSubscribe={() => navigateTo('subscription')}
              cycleProfile={cycleProfile}
            />
          );
        case 'keyFoods':
          return <KeyFoodsScreen onBack={goBack} {...sharedScreenProps} />;
        case 'shoppingList':
          return <ShoppingListScreen onBack={goBack} getToken={getToken} {...sharedScreenProps} />;
        case 'aiChat':
          return <AIChatScreen onBack={goBack} onNavigate={navigateTo} getToken={getToken} isPremium={canAccessPremium} {...sharedScreenProps} />;
        case 'mealAnalyzer':
          return <MealAnalyzerScreen onBack={goBack} onNavigate={navigateTo} isPremium={canAccessPremium} {...sharedScreenProps} />;

        default:
          return (
            <DashboardScreen 
              onNavigate={navigateTo} 
              cycleProfile={cycleProfile} 
              isPremium={canAccessPremium}
              {...sharedScreenProps} 
            />
          );
      }
    }

    switch (activeTab) {
      case 'today':
        return (
          <DashboardScreen 
             onNavigate={navigateTo} 
             cycleProfile={cycleProfile} 
             isPremium={canAccessPremium}
             {...sharedScreenProps} 
          />
        );
      case 'calendar':
        return <CalendarScreen onBack={() => setActiveTab('today')} onNavigate={navigateTo} cycleProfile={cycleProfile} dailyLogs={dailyLogs} onDeleteLog={handleDeleteLog} />;
      case 'nutrition':
        return (
          <NutritionScreen
            onBack={() => setActiveTab('today')}
            onNavigate={navigateTo}
            cycleDay={cycleInfo.cycleDay}
            isLocked={!canAccessPremium}
            onSubscribe={() => navigateTo('subscription')}
            {...sharedScreenProps}
          />
        );
      case 'videos':
        return (
          <VideosScreen
            onBack={() => setActiveTab('today')}
            currentPhaseKey={cycleInfo.currentPhaseKey}
            videos={videos}
            recipes={recipes}
            isLocked={!canAccessPremium}
            onSubscribe={() => navigateTo('subscription')}
          />
        );
      case 'profile':
        return <SettingsScreen onBack={() => setActiveTab('today')} onNavigate={navigateTo} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} isDeletingAccount={isDeletingAccount} isPremium={canAccessPremium} {...sharedScreenProps} />;
      default:
        return <DashboardScreen onNavigate={navigateTo} isPremium={canAccessPremium} {...sharedScreenProps} />;
    }
  };

  if (!authLoaded || !onboardingReady) {
    return <LoadingScreen />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onFinish={handleFinishOnboarding} />;
  }

  if (!isSignedIn) {
    return <LoginScreen onDemoLogin={handleDemoLogin} />;
  }

  if (profileLoading && isSignedIn) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.loadingLogo} 
          resizeMode="contain" 
        />
        <View style={{ height: 40 }} />
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>{t('dashboard.syncing_data')}</Text>
        <Text style={styles.loadingSub}>{t('dashboard.optimizing_exp')}</Text>
      </View>
    );
  }

  if (!wizardComplete) {
    return <WizardScreen cycleProfile={cycleProfile} onFinish={handleFinishWizard} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.mainWrapper}>
        <View style={styles.screenContainer}>
          <ScreenWrapper
            key={screenStack.length > 0
              ? screenStack[screenStack.length - 1] + '_' + screenStack.length
              : activeTab}
            isPush={screenStack.length > 0}
          >
            {renderMainContent()}
          </ScreenWrapper>
        </View>
        {toast.visible && (
          <View style={[styles.toastContainer, styles[`toast_${toast.type}`]]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}
        <View style={styles.tabBarWrapper}>
          <View style={styles.tabBar}>
            <Pressable onPress={() => handleTabPress('today')} style={styles.tabItem}>
              <View style={[styles.activeIndicator, activeTab === 'today' && styles.activeIndicatorActive]}>
                <Home size={22} color={activeTab === 'today' ? '#A3B3A5' : '#9B9589'} strokeWidth={activeTab === 'today' ? 2 : 1.5} />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'today' && styles.activeTabLabel]}>{t('nav.today')}</Text>
            </Pressable>
            <Pressable onPress={() => handleTabPress('calendar')} style={styles.tabItem}>
              <View style={[styles.activeIndicator, activeTab === 'calendar' && styles.activeIndicatorActive]}>
                <CircleDot size={22} color={activeTab === 'calendar' ? '#A3B3A5' : '#9B9589'} strokeWidth={activeTab === 'calendar' ? 2 : 1.5} />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'calendar' && styles.activeTabLabel]}>{t('nav.cycle')}</Text>
            </Pressable>
            <Pressable onPress={() => handleTabPress('videos')} style={styles.tabItem}>
              <View style={[styles.activeIndicator, activeTab === 'videos' && styles.activeIndicatorActive]}>
                <PlaySquare size={22} color={activeTab === 'videos' ? '#A3B3A5' : '#9B9589'} strokeWidth={activeTab === 'videos' ? 2 : 1.5} />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'videos' && styles.activeTabLabel]}>{t('nav.videos')}</Text>
            </Pressable>
            <Pressable onPress={() => handleTabPress('nutrition')} style={styles.tabItem}>
              <View style={[styles.activeIndicator, activeTab === 'nutrition' && styles.activeIndicatorActive]}>
                <Soup size={22} color={activeTab === 'nutrition' ? '#A3B3A5' : '#9B9589'} strokeWidth={activeTab === 'nutrition' ? 2 : 1.5} />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'nutrition' && styles.activeTabLabel]}>{t('nav.nutrition')}</Text>
            </Pressable>
            <Pressable onPress={() => handleTabPress('profile')} style={styles.tabItem}>
              <View style={[styles.activeIndicator, activeTab === 'profile' && styles.activeIndicatorActive]}>
                <User size={22} color={activeTab === 'profile' ? '#A3B3A5' : '#9B9589'} strokeWidth={activeTab === 'profile' ? 2 : 1.5} />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeTabLabel]}>{t('nav.profile')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const { i18n } = useTranslation();

  const missingRequired = getMissingRequiredEnv();
  const missingRecommended = getMissingRecommendedEnv();

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  if (missingRequired.length) {
    return <ConfigScreen missingRequired={missingRequired} missingRecommended={missingRecommended} />;
  }

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      {/* Hidden container for Clerk's CAPTCHA security on Web */}
      <View nativeID="clerk-captcha" style={{ display: 'none' }} />
      <AppAlertProvider>
        <AppShell key={i18n.language} />
      </AppAlertProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  loadingLogo: {
    width: 240,
    height: 240,
  },
  logoText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 42,
    color: '#FFF',
  },
  loadingText: {
    marginTop: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    color: colors.on_surface,
  },
  loadingSub: {
    marginTop: 8,
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    letterSpacing: 0.5,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  configTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    marginBottom: 8,
    textAlign: 'center',
  },
  configText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface_variant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  missingBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configItem: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#E11D48',
    marginVertical: 4,
  },
  mainWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 116 : 132,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  tabBar: {
    flexDirection: 'row',
    width: width * 0.9,
    height: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 39,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingBottom: 4,
    minWidth: 60,
  },
  activeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIndicatorActive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#A3B3A5',
  },
  tabLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#9B9589',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  activeTabLabel: {
    color: '#A3B3A5',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 10000,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 150,
  },
  toast_success: {
    borderLeftColor: '#22C55E',
  },
  toast_error: {
    borderLeftColor: '#EF4444',
  },
  toastText: {
    color: '#1A1A1A',
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
  },
});
