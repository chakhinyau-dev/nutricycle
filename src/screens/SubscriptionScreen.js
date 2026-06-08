import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  ImageBackground,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { ChevronLeft, Check, Crown, Zap, Shield, Heart } from 'lucide-react-native';
import { useStripe } from '../hooks/useStripePolyfill';
import {
  createPaymentIntent,
  fetchSubscriptionPricing,
  normalizeStripeLocale,
} from '../services/stripeService';

export const SubscriptionScreen = ({ onBack, onUpgrade, isPremium, activePlan, user, onStripePublishableKeyChange }) => {
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual'); // 'annual' or 'monthly'
  const defaultPricing = {
    annual: { unitAmount: 8499, currency: 'usd' },
    monthly: { unitAmount: 1499, currency: 'usd' },
  };
  const [pricing, setPricing] = useState(defaultPricing);
  const [pricingLoading, setPricingLoading] = useState(true);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    let isActive = true;

    const loadPricing = async () => {
      try {
        const latestPricing = await fetchSubscriptionPricing(i18n.language);
        if (isActive && latestPricing) {
          setPricing(latestPricing);
        }
      } catch (error) {
        console.warn('[Stripe] Could not load live subscription pricing:', error?.message || error);
      } finally {
        if (isActive) {
          setPricingLoading(false);
        }
      }
    };

    loadPricing();

    return () => {
      isActive = false;
    };
  }, [i18n.language]);

  const formatCurrency = (price, fallback) => {
    if (!price?.unitAmount || !price?.currency) {
      return fallback;
    }

    try {
      const amount = (price.unitAmount / 100).toFixed(2);
      const currency = String(price.currency).toUpperCase();
      if (currency === 'USD') {
        return `$${amount}`;
      } else if (currency === 'EUR') {
        return `€${amount}`;
      } else if (currency === 'INR') {
        return `₹${amount}`;
      } else {
        return `${amount} ${currency}`;
      }
    } catch {
      return fallback;
    }
  };

  const selectedPlanLabel = selectedPlan === 'annual'
    ? t('subscription.balance_annual')
    : t('subscription.balance_monthly');
  const selectedPlanType = selectedPlan === 'annual' ? 'yearly' : 'monthly';
  
  const annualPrice = pricing.annual || defaultPricing.annual;
  const monthlyPrice = pricing.monthly || defaultPricing.monthly;

  const annualPriceText = formatCurrency(annualPrice, '$89.99');
  const monthlyPriceText = formatCurrency(monthlyPrice, '$14.99');

  const runNativeCheckout = async ({ planKey, userEmail, userName, clerkUserId, locale }) => {
    const {
      clientSecret,
      customer,
      ephemeralKey,
      subscriptionId,
      currentPeriodEnd,
      price,
      publishableKey,
    } = await createPaymentIntent({
      planKey,
      customerEmail: userEmail,
      customerName: userName,
      clerkUserId,
      locale,
      metadata: {
        source: Platform.OS,
      },
    });

    if (publishableKey && typeof publishableKey === 'string') {
      console.log('[Stripe] Backend publishable key resolved for native checkout.');
      if (typeof onStripePublishableKeyChange === 'function') {
        onStripePublishableKeyChange(publishableKey);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      ...(customer && { customerId: customer }),
      ...(ephemeralKey && { customerEphemeralKeySecret: ephemeralKey }),
      merchantDisplayName: 'NutriCycle',
      allowsDelayedPaymentMethods: true,
      locale,
      defaultBillingDetails: {
        name: userName || 'Valued Member',
      },
    });

    if (error) {
      throw new Error(error.message || 'Unable to initialize the payment sheet.');
    }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === 'Canceled') {
        return null;
      }

      const message = presentError.message || 'Unable to complete the payment.';
      const shouldRetry = /payment_intent/i.test(message) && /no such/i.test(message);

      if (shouldRetry) {
        console.warn('[Stripe] Payment intent missing, retrying with a fresh subscription intent.');
        const retry = await createPaymentIntent({
          planKey,
          customerEmail: userEmail,
          customerName: userName,
          clerkUserId,
          locale,
          metadata: {
            source: Platform.OS,
            retry: 'true',
          },
        });

        const retryInit = await initPaymentSheet({
          paymentIntentClientSecret: retry.clientSecret,
          ...(retry.customer && { customerId: retry.customer }),
          ...(retry.ephemeralKey && { customerEphemeralKeySecret: retry.ephemeralKey }),
          merchantDisplayName: 'NutriCycle',
          allowsDelayedPaymentMethods: true,
          locale,
          defaultBillingDetails: {
            name: userName || 'Valued Member',
          },
        });

        if (retryInit.error) {
          throw new Error(retryInit.error.message || 'Unable to reinitialize the payment sheet.');
        }

        const retryPresent = await presentPaymentSheet();
        if (retryPresent.error) {
          if (retryPresent.error.code === 'Canceled') {
            return null;
          }
          throw new Error(retryPresent.error.message || message);
        }

        return retry;
      }

      throw new Error(message);
    }

    return {
      customer,
      ephemeralKey,
      subscriptionId,
      currentPeriodEnd,
      price,
    };
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || '';
      const userName = user?.fullName || user?.firstName || '';
      const clerkUserId = user?.id || '';
      const locale = normalizeStripeLocale(i18n.language);
      const planKey = selectedPlan;

      if (Platform.OS !== 'web') {
        const nativeResult = await runNativeCheckout({
          planKey,
          userEmail,
          userName,
          clerkUserId,
          locale,
        });

        if (!nativeResult) {
          return;
        }

        const { customer, subscriptionId, currentPeriodEnd, price } = nativeResult;

        onUpgrade({
          planKey,
          planType: selectedPlanType,
          stripeCustomerId: customer,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd,
          stripePriceId: price?.id,
          status: 'active',
        });
      } else {
        // REAL WEB FLOW (Stripe Checkout Redirect)
        const { url } = await createPaymentIntent({
          planKey,
          customerEmail: userEmail,
          customerName: userName,
          clerkUserId,
          locale,
          returnUrl: window.location.origin,
          metadata: {
            source: Platform.OS,
          },
        });
        
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('Could not generate checkout URL');
        }
      }
    } catch (e) {
      console.error('[Stripe Checkout Error]:', e);
      Alert.alert(
        t('settings.error'), 
        `${t('subscription.payment_session_error')}\n\nDetail: ${e.message || 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    { icon: Crown, title: t('subscription.feature1_title'), sub: t('subscription.feature1_sub') },
    { icon: Zap, title: t('subscription.feature2_title'), sub: t('subscription.feature2_sub') },
    { icon: Shield, title: t('subscription.feature3_title'), sub: t('subscription.feature3_sub') },
    { icon: Heart, title: t('subscription.feature4_title'), sub: t('subscription.feature4_sub') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Premium Banner */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800' }} 
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>{t('subscription.pro_title') || 'NUTRICYCLE PRO'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.badgePill}>
              <Crown size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.badgeText}>{isPremium ? t('subscription.pro_member') : t('subscription.go_premium')}</Text>
            </View>
            <Text style={styles.heroTitle}>
              {isPremium ? t('subscription.already_elite') : t('subscription.upgrade_title')}
            </Text>
            <Text style={styles.heroSub}>
              {isPremium ? t('subscription.already_elite_sub') : t('subscription.upgrade_subtitle')}
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('subscription.exclusive_benefits')}</Text>
          
          {features.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.iconCircle}>
                <item.icon size={22} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSub}>{item.sub}</Text>
              </View>
            </View>
          ))}

          {/* Pricing Cards */}
          <View style={styles.pricingSection}>
            <Pressable 
                onPress={() => setSelectedPlan('annual')}
                style={[
                    styles.card, 
                    selectedPlan === 'annual' ? styles.cardActive : styles.cardInactive
                ]}
             >
                <View style={[styles.selectionIndicator, selectedPlan === 'annual' && styles.selectionIndicatorActive]}>
                  {selectedPlan === 'annual' && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.planName, selectedPlan === 'annual' ? { color: colors.primary } : { color: colors.on_surface_variant }]}>
                  {t('subscription.balance_annual') || 'Annual Hormonal Plan'}
                </Text>
                <Text style={styles.price}>
                  {annualPriceText}
                  <Text style={styles.period}>/{t('common.year') || 'year'}</Text>
                </Text>
                <Text style={styles.livePriceHint}>
                  {pricingLoading ? t('subscription.loading_price') || 'Loading live Stripe price...' : t('subscription.live_price') || 'Live price from Stripe'}
                </Text>
                <Text style={styles.savings}>{t('subscription.save_40') || 'Save 40%'}</Text>
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                   <Text style={styles.badgeTextWhite}>{t('subscription.recommended') || 'RECOMMENDED'}</Text>
                </View>
             </Pressable>

             <Pressable 
                onPress={() => setSelectedPlan('monthly')}
                style={[
                    styles.card, 
                    selectedPlan === 'monthly' ? styles.cardActive : styles.cardInactive
                ]}
             >
                <View style={[styles.selectionIndicator, selectedPlan === 'monthly' && styles.selectionIndicatorActive]}>
                  {selectedPlan === 'monthly' && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.planName, selectedPlan === 'monthly' ? { color: colors.primary } : { color: colors.on_surface_variant }]}>
                  {t('subscription.balance_monthly') || 'Balance Monthly Plan'}
                </Text>
                <Text style={styles.price}>
                  {monthlyPriceText}
                  <Text style={styles.period}>/{t('common.month') || 'month'}</Text>
                </Text>
                <Text style={styles.livePriceHint}>
                  {pricingLoading ? t('subscription.loading_price') || 'Loading live Stripe price...' : t('subscription.live_price') || 'Live price from Stripe'}
                </Text>
                <Text style={styles.savings}>{t('subscription.no_commitment') || 'No commitment'}</Text>
             </Pressable>
          </View>

          <View style={{ height: 160 }} />
        </View>
      </ScrollView>

      {/* Floating Checkout */}
      <View style={styles.footer}>
         <Pressable 
           style={[
             styles.mainCta, 
             (isPremium && activePlan === selectedPlanType) && { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }
           ]} 
           onPress={() => (isPremium && activePlan === selectedPlanType) ? null : handleCheckout()}
           disabled={isProcessing || (isPremium && activePlan === selectedPlanType)}
         >
            {isProcessing ? (
              <ActivityIndicator color="#6366F1" />
            ) : (
              <>
                <Text 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.ctaText, 
                    (isPremium && activePlan === selectedPlanType) && { color: '#64748B' }
                  ]}
                >
                  {isPremium 
                    ? (activePlan === selectedPlanType ? t('subscription.active_plan') || 'Active Plan' : (selectedPlanType === 'yearly' ? t('subscription.upgrade_annual') || 'Upgrade to Annual' : t('subscription.switch_monthly') || 'Switch to Monthly'))
                    : selectedPlan === 'annual' 
                        ? (t('subscription.pay_annual') || 'PAY ANNUAL').toUpperCase() 
                        : (t('subscription.pay_monthly') || 'PAY MONTHLY').toUpperCase()}
                </Text>
                <Crown size={20} color={(isPremium && activePlan === selectedPlanType) ? '#94A3B8' : '#FFF'} />
              </>
            )}
          </Pressable>
          <Text style={styles.footerLegal}>{t('subscription.footer_legal')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    height: 480,
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,68,83,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroContent: {
    paddingHorizontal: 28,
    marginTop: 60,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  badgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    color: '#FFD700',
    marginLeft: 6,
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 38,
    color: '#FFF',
    lineHeight: 46,
    marginBottom: 16,
  },
  heroSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -40,
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.on_surface,
    marginBottom: 4,
  },
  featureSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.on_surface_variant,
    lineHeight: 20,
  },
  pricingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
    transform: [{ scale: 1.02 }],
  },
  cardInactive: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F1F1E8',
    opacity: 0.8,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F1F1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicatorActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  planName: {
     fontFamily: 'Outfit_700Bold',
     fontSize: 13,
     color: colors.primary,
     marginBottom: 12,
  },
  price: {
     fontFamily: 'InstrumentSerif_400Regular',
     fontSize: 24,
     color: colors.on_surface,
  },
  period: {
     fontSize: 14,
     color: colors.on_surface_variant,
  },
  savings: {
     fontFamily: 'Outfit_700Bold',
     fontSize: 11,
     color: '#EC6A70',
     backgroundColor: '#FFF2F2',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 6,
     marginTop: 12,
  },
  livePriceHint: {
     fontFamily: 'Outfit_500Medium',
     fontSize: 10,
     color: colors.on_surface_variant,
     marginTop: 8,
     textAlign: 'center',
   },
  billedAnnuallyText: {
     fontFamily: 'Outfit_500Medium',
     fontSize: 11,
     color: colors.on_surface_variant,
     marginTop: 4,
     textAlign: 'center',
  },
  badge: {
     position: 'absolute',
     top: -12,
     paddingHorizontal: 10,
     paddingVertical: 4,
     borderRadius: 8,
  },
  badgeTextWhite: {
     fontFamily: 'Outfit_700Bold',
     fontSize: 9,
     color: '#FFF',
     letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F1F1E8',
  },
  mainCta: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.on_surface,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: '#FFF',
    letterSpacing: 1,
    marginRight: 12,
    flexShrink: 1,
    textAlign: 'center',
  },
  footerLegal: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.on_surface_variant,
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1E8',
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    color: colors.on_surface,
  },
  modalBody: {
    padding: 24,
  },
  modalText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    lineHeight: 22,
    marginBottom: 24,
  },
  mockCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  cardPrice: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
  },
  testInfo: {
    backgroundColor: '#FFF8E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE4B3',
  },
  testInfoText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#B8860B',
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: '#635BFF', // Stripe Blue
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FFF',
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  orderSummary: {
    marginBottom: 20,
  },
  orderLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginBottom: 4,
  },
  orderValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.on_surface,
  },
  stripeFoot: {
    marginTop: 20,
    textAlign: 'center',
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    color: '#635BFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
});
