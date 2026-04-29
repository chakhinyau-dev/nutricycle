import { Platform } from 'react-native';

// Web-specific version of the useStripe hook.
// This version strictly uses mocks to avoid bundling native dependencies on Web.
export const useStripe = () => {
  return {
    initPaymentSheet: async () => ({ error: null }),
    presentPaymentSheet: async () => ({ error: null }),
    confirmPayment: async () => ({ error: null }),
  };
};
