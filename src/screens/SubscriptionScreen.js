import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { ChevronLeft, Check, Crown, Zap, Shield, Heart, Star } from 'lucide-react-native';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPremiumActive,
  getActivePlanType,
} from '../services/revenuecatService';

export const SubscriptionScreen = ({ onBack, onUpgrade, isPremium, activePlan }) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [monthlyPkg, setMonthlyPkg] = useState(null);
  const [annualPkg, setAnnualPkg] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  const monthlyPkgRef = useRef(null);
  const annualPkgRef  = useRef(null);

  const defaultPricing = {
    annual:  { priceString: '$84.99', period: 'year' },
    monthly: { priceString: '$14.99', period: 'month' },
  };

  const fetchPackages = async () => {
    const offering = await getOfferings();
    if (!offering) return { mPkg: null, aPkg: null };
    const pkgs = offering.availablePackages || [];
    const mPkg = pkgs.find(p =>
      p.packageType === 'MONTHLY' ||
      p.product?.productIdentifier?.includes('monthly')
    ) || null;
    const aPkg = pkgs.find(p =>
      p.packageType === 'ANNUAL' ||
      p.product?.productIdentifier?.includes('annual')
    ) || null;
    return { mPkg, aPkg };
  };

  useEffect(() => {
    let isActive = true;
    const loadOfferings = async () => {
      if (Platform.OS === 'web') { setPricingLoading(false); return; }
      try {
        const { mPkg, aPkg } = await fetchPackages();
        if (!isActive) return;
        if (mPkg) { setMonthlyPkg(mPkg); monthlyPkgRef.current = mPkg; }
        if (aPkg) { setAnnualPkg(aPkg);  annualPkgRef.current  = aPkg; }
      } catch (e) {
        console.warn('[RC] Could not load offerings:', e?.message);
      } finally {
        if (isActive) setPricingLoading(false);
      }
    };
    loadOfferings();
    return () => { isActive = false; };
  }, []);

  // --- Animations ---
  const featureAnims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(22),
    }))
  ).current;
  const annualCardScale  = useRef(new Animated.Value(0.86)).current;
  const monthlyCardScale = useRef(new Animated.Value(0.86)).current;
  const badgeScale       = useRef(new Animated.Value(0)).current;
  const checkmarkScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.stagger(80, featureAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,    { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.spring(a.translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        ])
      )),
      Animated.sequence([
        Animated.delay(460),
        Animated.parallel([
          Animated.spring(annualCardScale,  { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
          Animated.spring(monthlyCardScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(620),
        Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    checkmarkScale.setValue(0);
    Animated.spring(checkmarkScale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [selectedPlan]);

  const ctaScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaScale, { toValue: 1.025, duration: 1100, useNativeDriver: true }),
        Animated.timing(ctaScale, { toValue: 1,     duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const annualPriceText  = annualPkg?.product?.priceString  || defaultPricing.annual.priceString;
  const monthlyPriceText = monthlyPkg?.product?.priceString || defaultPricing.monthly.priceString;

  const selectedPlanType = selectedPlan === 'annual' ? 'yearly' : 'monthly';

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      let pkg = selectedPlan === 'annual'
        ? (annualPkgRef.current  || annualPkg)
        : (monthlyPkgRef.current || monthlyPkg);

      if (!pkg) {
        // RC may not have been configured when the screen first mounted — retry once
        console.log('[RC] Package not cached, retrying offerings fetch...');
        const { mPkg, aPkg } = await fetchPackages();
        if (mPkg) { setMonthlyPkg(mPkg); monthlyPkgRef.current = mPkg; }
        if (aPkg) { setAnnualPkg(aPkg);  annualPkgRef.current  = aPkg; }
        pkg = selectedPlan === 'annual' ? aPkg : mPkg;
      }

      if (!pkg) throw new Error('Producto no disponible. Intenta de nuevo.');

      const customerInfo = await purchasePackage(pkg);
      if (!customerInfo) return; // user cancelled

      if (isPremiumActive(customerInfo)) {
        const planType = getActivePlanType(customerInfo);
        // Must be awaited: onUpgrade writes to Supabase and can fail after a real
        // purchase already went through. Without awaiting, that failure becomes an
        // unhandled rejection this try/catch never sees, and `finally` below resets
        // the loading state as if everything succeeded.
        await onUpgrade({
          planKey: planType || selectedPlan,
          planType: planType === 'monthly' ? 'monthly' : 'yearly',
          status: 'active',
          rcCustomerInfo: customerInfo,
        });
      }
    } catch (e) {
      console.error('[RC Checkout Error]:', e);
      Alert.alert(
        t('settings.error'),
        e?.message || t('subscription.payment_session_error')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      const customerInfo = await restorePurchases();
      if (isPremiumActive(customerInfo)) {
        const planType = getActivePlanType(customerInfo);
        // Awaited for the same reason as handleCheckout above. Also: no separate
        // success alert here — onUpgrade (App.js's handleUpgrade) already shows one
        // on success, so this used to pop two "success" alerts back to back.
        await onUpgrade({
          planKey: planType || 'annual',
          planType: planType === 'monthly' ? 'monthly' : 'yearly',
          status: 'active',
          rcCustomerInfo: customerInfo,
        });
      } else {
        Alert.alert('', 'No se encontró ninguna suscripción activa.');
      }
    } catch (e) {
      Alert.alert(t('settings.error'), e?.message || 'Error al restaurar compras.');
    } finally {
      setIsProcessing(false);
    }
  };

  const FEATURE_ICONS = [Crown, Zap, Shield, Heart, Star];
  const features = [
    { title: t('subscription.feature1_title'), sub: t('subscription.feature1_sub') },
    { title: t('subscription.feature2_title'), sub: t('subscription.feature2_sub') },
    { title: t('subscription.feature3_title'), sub: t('subscription.feature3_sub') },
    { title: t('subscription.feature4_title'), sub: t('subscription.feature4_sub') },
    { title: t('subscription.feature5_title'), sub: t('subscription.feature5_sub') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800' }}
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>PLAN HORMONAL</Text>
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

          {features.map((item, index) => {
            const FeatureIcon = FEATURE_ICONS[index] || Star;
            return (
              <Animated.View
                key={index}
                style={[styles.featureItem, {
                  opacity:   featureAnims[index].opacity,
                  transform: [{ translateY: featureAnims[index].translateY }],
                }]}
              >
                <View style={styles.iconCircle}>
                  <FeatureIcon size={22} color="#968DA1" strokeWidth={1.8} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureSub}>{item.sub}</Text>
                </View>
              </Animated.View>
            );
          })}

          {/* Pricing Cards */}
          <View style={styles.pricingSection}>
            <Animated.View style={{ flex: 1, transform: [{ scale: annualCardScale }] }}>
              <Pressable
                onPress={() => setSelectedPlan('annual')}
                style={[styles.card, selectedPlan === 'annual' ? styles.cardActive : styles.cardInactive]}
              >
                <View style={[styles.selectionIndicator, selectedPlan === 'annual' && styles.selectionIndicatorActive]}>
                  {selectedPlan === 'annual' && (
                    <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                      <Check size={14} color="#FFF" strokeWidth={3} />
                    </Animated.View>
                  )}
                </View>
                <Text style={[styles.planName, { color: selectedPlan === 'annual' ? colors.primary : colors.on_surface_variant }]}>
                  {t('subscription.balance_annual')}
                </Text>
                <Text style={styles.price}>
                  {annualPriceText}
                  <Text style={styles.period}>/{t('common.year')}</Text>
                </Text>
                <Text style={styles.livePriceHint}>
                  {pricingLoading ? t('subscription.loading_price') : Platform.OS === 'android' ? 'Precio desde Google Play' : 'Precio desde App Store'}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.savings}>{t('subscription.save_40')}</Text>
                <Animated.View style={[styles.badge, { backgroundColor: colors.primary, transform: [{ scale: badgeScale }] }]}>
                  <Text style={styles.badgeTextWhite}>{t('subscription.recommended')}</Text>
                </Animated.View>
              </Pressable>
            </Animated.View>

            <Animated.View style={{ flex: 1, transform: [{ scale: monthlyCardScale }] }}>
              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                style={[styles.card, selectedPlan === 'monthly' ? styles.cardActive : styles.cardInactive]}
              >
                <View style={[styles.selectionIndicator, selectedPlan === 'monthly' && styles.selectionIndicatorActive]}>
                  {selectedPlan === 'monthly' && (
                    <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                      <Check size={14} color="#FFF" strokeWidth={3} />
                    </Animated.View>
                  )}
                </View>
                <Text style={[styles.planName, { color: selectedPlan === 'monthly' ? colors.primary : colors.on_surface_variant }]}>
                  {t('subscription.balance_monthly')}
                </Text>
                <Text style={styles.price}>
                  {monthlyPriceText}
                  <Text style={styles.period}>/{t('common.month')}</Text>
                </Text>
                <Text style={styles.livePriceHint}>
                  {pricingLoading ? t('subscription.loading_price') : Platform.OS === 'android' ? 'Precio desde Google Play' : 'Precio desde App Store'}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.savings}>{t('subscription.no_commitment')}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: ctaScale }], width: '100%' }}>
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
                  style={[styles.ctaText, (isPremium && activePlan === selectedPlanType) && { color: '#64748B' }]}
                >
                  {isPremium
                    ? (activePlan === selectedPlanType
                        ? t('subscription.active_plan')
                        : (selectedPlanType === 'yearly' ? t('subscription.upgrade_annual') : t('subscription.switch_monthly')))
                    : selectedPlan === 'annual'
                        ? (t('subscription.pay_annual') || 'PAY ANNUAL').toUpperCase()
                        : (t('subscription.pay_monthly') || 'PAY MONTHLY').toUpperCase()}
                </Text>
                <Crown size={20} color={(isPremium && activePlan === selectedPlanType) ? '#94A3B8' : '#FFF'} />
              </>
            )}
          </Pressable>
        </Animated.View>

        {(Platform.OS === 'ios' || Platform.OS === 'android') && !isPremium && (
          <Pressable onPress={handleRestore} disabled={isProcessing} style={{ paddingVertical: 8 }}>
            <Text style={styles.restoreText}>{t('subscription.restore_activate') || 'Restaurar compra'}</Text>
          </Pressable>
        )}

        <Text style={styles.footerLegal}>{t('subscription.footer_legal')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 480, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(74,68,83,0.5)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 16, color: '#FFF', letterSpacing: 2, textTransform: 'uppercase' },
  heroContent: { paddingHorizontal: 28, marginTop: 60 },
  badgePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  badgeText: { fontFamily: 'Outfit_700Bold', fontSize: 10, color: '#FFD700', marginLeft: 6, letterSpacing: 1 },
  heroTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 38, color: '#FFF', lineHeight: 46, marginBottom: 16 },
  heroSub: { fontFamily: 'Outfit_500Medium', fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 24 },
  content: { backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingHorizontal: 28, paddingTop: 48 },
  sectionTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: '#968DA1', marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F0F8', borderWidth: 1.5, borderColor: '#E8E2F0', justifyContent: 'center', alignItems: 'center', marginRight: 16, flexShrink: 0 },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.on_surface, marginBottom: 4 },
  featureSub: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.on_surface_variant, lineHeight: 20 },
  pricingSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 16 },
  card: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 3 },
  cardActive: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F0F9FF', transform: [{ scale: 1.02 }] },
  cardInactive: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#F1F1E8', opacity: 0.8 },
  selectionIndicator: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#F1F1E8', justifyContent: 'center', alignItems: 'center' },
  selectionIndicatorActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  planName: { fontFamily: 'Outfit_700Bold', fontSize: 13, marginBottom: 12 },
  price: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: colors.on_surface },
  period: { fontSize: 14, color: colors.on_surface_variant },
  savings: { fontFamily: 'Outfit_700Bold', fontSize: 11, color: '#EC6A70', backgroundColor: '#FFF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 12 },
  livePriceHint: { fontFamily: 'Outfit_500Medium', fontSize: 10, color: colors.on_surface_variant, marginTop: 8, textAlign: 'center' },
  badge: { position: 'absolute', top: -12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTextWhite: { fontFamily: 'Outfit_700Bold', fontSize: 9, color: '#FFF', letterSpacing: 0.5 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F1F1E8', alignItems: 'center' },
  mainCta: { flexDirection: 'row', height: 64, backgroundColor: '#968DA1', borderRadius: 32, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8, width: '100%' },
  ctaText: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#FFF', letterSpacing: 1, marginRight: 12, flexShrink: 1, textAlign: 'center' },
  restoreText: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.primary, textAlign: 'center' },
  footerLegal: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.on_surface_variant, textAlign: 'center', marginTop: 4 },
});
