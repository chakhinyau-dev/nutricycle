import React, { useEffect, useMemo, useState } from 'react';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, ActivityIndicator, Pressable, Text, Dimensions, Alert, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, SignedIn, SignedOut, useUser, useAuth, useClerk } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
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
import { Home, Calendar, ShoppingBag, User, Play } from 'lucide-react-native';

import { StripeProvider } from './src/components/StripeWrapper';

import { colors } from './src/theme/colors';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
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
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { VideosScreen } from './src/screens/VideosScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { MOCK_RECIPES } from './src/utils/mockData';
import { ARTICLE_LIBRARY } from './src/utils/articleData';
import { VIDEO_LIBRARY } from './src/utils/videoData';
import { DEFAULT_CYCLE_PROFILE, getCycleInsights, normalizeCycleProfile } from './src/utils/cycle';
import { env, getMissingRecommendedEnv, getMissingRequiredEnv } from './src/lib/env';
import { getLocalProfile, getOnboardingComplete, setLocalProfile, setOnboardingComplete, getAIPrediction, setAIPrediction } from './src/services/appStorage';
import { loadUserProfile, saveUserProfile } from './src/services/profileService';
import { loadDailyLogs, deleteDailyLog } from './src/services/dailyLogService';
import { getCyclePredictionAI } from './src/services/aiService';
import { loadRecipes } from './src/services/recipeService';
import { loadSavedRecipeIds, toggleSavedRecipeForUser } from './src/services/savedRecipeService';
import { loadArticles } from './src/services/articleService';
import { loadVideos } from './src/services/videoService';
import { requestNotificationPermissions, sendAIReportNotification } from './src/services/notificationService';
import { recordSubscription, loadUserSubscription } from './src/services/subscriptionService';
import { finalizeSubscriptionSession } from './src/services/stripeService';

const { width } = Dimensions.get('window');

const mainTabs = ['home', 'calendar', 'recipes', 'profile'];

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
  const { t, i18n } = useTranslation();
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

const AppShell = ({ onStripePublishableKeyChange }) => {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
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
  const [dailyLogs, setDailyLogs] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [activeTab, setActiveTab] = useState('calendar');
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
      const onboardingComplete = await getOnboardingComplete();

      if (!isMounted) {
        return;
      }

      setHasCompletedOnboarding(onboardingComplete);
      setOnboardingReady(true);
      
      // Request notifications permission
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

      setProfileLoading(true);

      const localProfile = await getLocalProfile(user.id);
      const normalizedLocalProfile = normalizeCycleProfile(localProfile || {});

      if (isMounted && localProfile) {
        setWizardComplete(Boolean(localProfile.wizardComplete));
        setCycleProfile(normalizedLocalProfile);
      }

      const [profileResult, recipeResult, savedIdsResult, subResult] = await Promise.all([
        loadUserProfile(getToken, user.id),
        loadRecipes(getToken),
        loadSavedRecipeIds(getToken, user.id),
        loadUserSubscription(getToken, user.id)
      ]);

      const [articlesResult, videosResult] = await Promise.all([loadArticles(getToken), loadVideos(getToken)]);

      if (!isMounted) {
        return;
      }

      setRecipes(recipeResult || MOCK_RECIPES);
      setSavedRecipeIds(savedIdsResult || []);
      setArticles(articlesResult || ARTICLE_LIBRARY);
      setVideos(videosResult || VIDEO_LIBRARY);
      setSubscription(subResult);

      if (profileResult?.current_phase) {
        const normalizedRemoteProfile = normalizeCycleProfile(profileResult);
        setCycleProfile(normalizedRemoteProfile);
        setWizardComplete(true);

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

      setProfileLoading(false);
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

  useEffect(() => {
    // Check for Stripe success redirect on Web
    if (Platform.OS === 'web' && isSignedIn && user?.id) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true' && params.get('session_id')) {
        const finalizeUpgrade = async () => {
          try {
            console.log('[Stripe] Payment success detected, finalizing Stripe subscription...');
            const finalized = await finalizeSubscriptionSession({
              sessionId: params.get('session_id'),
              locale: i18n.language,
            });
            await handleUpgrade(finalized);
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err) {
            console.error('[Stripe Upgrade Error]:', err);
          }
        };
        finalizeUpgrade();
      }
    }
  }, [isSignedIn, user?.id, i18n.language]);

  const refreshAdminData = async () => {
    const [freshVideos, freshRecipes] = await Promise.all([
      loadVideos(getToken),
      loadRecipes(getToken)
    ]);
    if (freshVideos) setVideos(freshVideos);
    if (freshRecipes) setRecipes(freshRecipes);
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
      // Rollback on failure
      setDailyLogs(previousLogs);
      Alert.alert('Error', 'Failed to delete log. Please try again.');
    } else {
       showToast('Log removed from bio-history', 'success');
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
  };

  const handleProfileSave = async (profileInput) => {
    await persistProfile(profileInput);
    goBack();
  };

  const handleLogout = async () => {
    await signOut();
    setActiveTab('home');
    setScreenStack([]);
    setNavigationParams({});
  };

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = user.publicMetadata?.role;
    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      '';
    return (
      role === 'owner' ||
      role === 'admin' ||
      email === 'salat.mahenoor7.8.6@gmail.com'
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
      user,
      isAdmin,
      dailyLogs,
      onRefreshAI: () => {},
    }),
    [cycleInfo, cycleProfile, recipes, savedRecipeIds, articles, videos, user, isAdmin, dailyLogs]
  );

  const savedRecipes = useMemo(
    () => recipes.filter((recipe) => savedRecipeIds.includes(String(recipe.id))),
    [recipes, savedRecipeIds]
  );

  const renderMainContent = () => {
    if (screenStack.length > 0) {
      const topScreen = screenStack[screenStack.length - 1];
      switch (topScreen) {
        case 'hydration':
          return <HydrationScreen onBack={goBack} />;
        case 'wellness':
          return <WellnessScreen onBack={goBack} />;
        case 'articles':
          return <ArticlesScreen onBack={goBack} articles={articles} />;
        case 'dailyLog':
          return <DailyLogScreen onBack={goBack} onNavigate={navigateTo} {...sharedScreenProps} />;
        case 'notifications':
          return <NotificationsScreen onBack={goBack} onNavigate={navigateTo} {...sharedScreenProps} />;
        case 'settings':
          return <SettingsScreen onBack={goBack} onNavigate={navigateTo} onLogout={handleLogout} isPremium={cycleProfile.isPremium} {...sharedScreenProps} />;
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
              isPremium={cycleProfile.isPremium}
              activePlan={subscription?.plan_id || (subscription?.plan_type)}
              user={user}
              onStripePublishableKeyChange={onStripePublishableKeyChange}
            />
          );
        case 'videos':
          return <VideosScreen onBack={goBack} currentPhaseKey={cycleInfo.currentPhaseKey} videos={videos} />;
        case 'admin':
          return (
            <AdminScreen 
              onBack={goBack} 
              videos={videos} 
              recipes={recipes} 
              onRefresh={refreshAdminData} 
              isAdmin={isAdmin}
              user={user}
              isPremium={cycleProfile.isPremium}
              onTogglePremium={handleUpgrade}
              showToast={showToast}
            />
          );

        default:
          return (
            <DashboardScreen 
              onNavigate={navigateTo} 
              cycleProfile={cycleProfile} 
              isPremium={cycleProfile.isPremium}
              {...sharedScreenProps} 
            />
          );
      }
    }

    switch (activeTab) {
      case 'home':
        return (
          <DashboardScreen 
             onNavigate={navigateTo} 
             cycleProfile={cycleProfile} 
             isPremium={cycleProfile.isPremium}
             {...sharedScreenProps} 
          />
        );
      case 'calendar':
        return <CalendarScreen onBack={() => setActiveTab('home')} cycleProfile={cycleProfile} dailyLogs={dailyLogs} onDeleteLog={handleDeleteLog} />;
      case 'recipes':
        return <RecipesScreen onBack={() => setActiveTab('home')} onNavigate={navigateTo} {...sharedScreenProps} />;
      case 'videos':
        return <VideosScreen onBack={() => setActiveTab('home')} currentPhaseKey={cycleInfo.currentPhaseKey} videos={videos} />;
      case 'profile':
        return <SettingsScreen onBack={() => setActiveTab('home')} onNavigate={navigateTo} onLogout={handleLogout} {...sharedScreenProps} />;
      default:
        return <DashboardScreen onNavigate={navigateTo} {...sharedScreenProps} />;
    }
  };

  if (!authLoaded || !onboardingReady) {
    return <LoadingScreen />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onFinish={handleFinishOnboarding} />;
  }

  if (!isSignedIn) {
    return <LoginScreen />;
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
        <View style={styles.screenContainer}>{renderMainContent()}</View>
        {toast.visible && (
          <View style={[styles.toastContainer, styles[`toast_${toast.type}`]]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}
        {screenStack.length === 0 ? (
          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              <Pressable onPress={() => handleTabPress('home')} style={styles.tabItem}>
                <View style={[styles.activeIndicator, activeTab === 'home' && styles.activeIndicatorActive]}>
                  <Home size={22} color={activeTab === 'home' ? '#FFFFFF' : '#64748B'} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                </View>
                <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>{t('nav.home')}</Text>
              </Pressable>
              <Pressable onPress={() => handleTabPress('calendar')} style={styles.tabItem}>
                <View style={[styles.activeIndicator, activeTab === 'calendar' && styles.activeIndicatorActive]}>
                  <Calendar size={22} color={activeTab === 'calendar' ? '#FFFFFF' : '#64748B'} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} />
                </View>
                <Text style={[styles.tabLabel, activeTab === 'calendar' && styles.activeTabLabel]}>{t('nav.cycle')}</Text>
              </Pressable>
              <Pressable onPress={() => handleTabPress('videos')} style={styles.tabItem}>
                <View style={[styles.activeIndicator, activeTab === 'videos' && styles.activeIndicatorActive]}>
                  <Play size={22} color={activeTab === 'videos' ? '#FFFFFF' : '#64748B'} strokeWidth={activeTab === 'videos' ? 2.5 : 2} />
                </View>
                <Text style={[styles.tabLabel, activeTab === 'videos' && styles.activeTabLabel]}>{t('nav.videos')}</Text>
              </Pressable>
              <Pressable onPress={() => handleTabPress('recipes')} style={styles.tabItem}>
                <View style={[styles.activeIndicator, activeTab === 'recipes' && styles.activeIndicatorActive]}>
                  <ShoppingBag size={22} color={activeTab === 'recipes' ? '#FFFFFF' : '#64748B'} strokeWidth={activeTab === 'recipes' ? 2.5 : 2} />
                </View>
                <Text style={[styles.tabLabel, activeTab === 'recipes' && styles.activeTabLabel]}>{t('nav.recipes')}</Text>
              </Pressable>
              <Pressable onPress={() => handleTabPress('profile')} style={styles.tabItem}>
                <View style={[styles.activeIndicator, activeTab === 'profile' && styles.activeIndicatorActive]}>
                  <User size={22} color={activeTab === 'profile' ? '#FFFFFF' : '#64748B'} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                </View>
                <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeTabLabel]}>{t('nav.profile')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  const [stripePublishableKey, setStripePublishableKey] = useState(env.stripePublishableKey);

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
      <StripeProvider
        key={stripePublishableKey || env.stripePublishableKey}
        publishableKey={stripePublishableKey || env.stripePublishableKey}
        merchantIdentifier="merchant.nutricycle"
      >
        {/* Hidden container for Clerk's CAPTCHA security on Web */}
        <View nativeID="clerk-captcha" style={{ display: 'none' }} />
        <AppShell key={i18n.language} onStripePublishableKeyChange={setStripePublishableKey} />
      </StripeProvider>
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIndicatorActive: {
    backgroundColor: '#1A1A1A',
  },
  tabLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  activeTabLabel: {
    color: '#1A1A1A',
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
