import { Platform } from 'react-native';

const RC_API_KEY_IOS = 'appl_nHXAVeKhaSsgnrwfHYpoNeVXfhJ';
export const ENTITLEMENT_ID = 'Nutricycle Pro';
export const MONTHLY_PRODUCT_ID = 'com.salatmahenoor.nutricycle.monthly';
export const ANNUAL_PRODUCT_ID  = 'com.salatmahenoor.nutricycle.annual';

// RevenueCat is iOS only — App Store purchases are not available on Android/web
const isSupported = () => Platform.OS === 'ios';

let Purchases = null;

const getRC = async () => {
  if (!isSupported()) return null;
  if (!Purchases) {
    try {
      Purchases = (await import('react-native-purchases')).default;
    } catch (e) {
      console.warn('[RC] react-native-purchases not available:', e?.message);
      return null;
    }
  }
  return Purchases;
};

export const configureRevenueCat = async (userId = null) => {
  const RC = await getRC();
  if (!RC) return;
  try {
    RC.configure({ apiKey: RC_API_KEY_IOS });
    if (userId) await RC.logIn(userId);
  } catch (e) {
    console.error('[RC] configure error:', e);
  }
};

export const loginRevenueCat = async (userId) => {
  const RC = await getRC();
  if (!RC || !userId) return;
  try {
    await RC.logIn(userId);
  } catch (e) {
    console.error('[RC] login error:', e);
  }
};

export const getOfferings = async () => {
  const RC = await getRC();
  if (!RC) return null;
  try {
    const offerings = await RC.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('[RC] getOfferings error:', e);
    return null;
  }
};

export const purchasePackage = async (pkg) => {
  const RC = await getRC();
  if (!RC) throw new Error('Las compras solo están disponibles en la app de iOS desde el App Store.');
  try {
    const { customerInfo } = await RC.purchasePackage(pkg);
    return customerInfo;
  } catch (e) {
    if (e.userCancelled) return null;
    throw e;
  }
};

export const restorePurchases = async () => {
  const RC = await getRC();
  if (!RC) return null;
  try {
    return await RC.restorePurchases();
  } catch (e) {
    console.error('[RC] restorePurchases error:', e);
    return null;
  }
};

export const getCustomerInfo = async () => {
  const RC = await getRC();
  if (!RC) return null;
  try {
    return await RC.getCustomerInfo();
  } catch (e) {
    console.error('[RC] getCustomerInfo error:', e);
    return null;
  }
};

export const isPremiumActive = (customerInfo) => {
  if (!customerInfo) return false;
  return !!customerInfo.entitlements?.active?.[ENTITLEMENT_ID];
};

export const getActivePlanType = (customerInfo) => {
  if (!isPremiumActive(customerInfo)) return null;
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const productId = entitlement?.productIdentifier || '';
  if (productId.includes('monthly')) return 'monthly';
  return 'annual';
};
