import { Platform } from 'react-native';

// Dynamically use the real Stripe SDK on Native, or a mock on Web
let useStripeHook;

try {
  if (Platform.OS !== 'web') {
    const { useStripe } = require('@stripe/stripe-react-native');
    useStripeHook = useStripe;
  } else {
    // Web Polyfill
    useStripeHook = () => ({
      initPaymentSheet: async () => ({ error: null }),
      presentPaymentSheet: async () => ({ error: null }),
      confirmPayment: async () => ({ error: null }),
    });
  }
} catch (e) {
  console.warn('Stripe SDK not available, using polyfill');
  useStripeHook = () => ({
    initPaymentSheet: async () => ({ error: null }),
    presentPaymentSheet: async () => ({ error: null }),
    confirmPayment: async () => ({ error: null }),
  });
}

export const useStripe = useStripeHook;
