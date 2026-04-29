import React from 'react';
import { StripeProvider as NativeStripeProvider } from '@stripe/stripe-react-native';

export const StripeProvider = ({ children, publishableKey }) => {
  return (
    <NativeStripeProvider publishableKey={publishableKey}>
      {children}
    </NativeStripeProvider>
  );
};
