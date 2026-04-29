import React from 'react';
import { Platform } from 'react-native';

export const StripeProvider = ({ children, publishableKey, merchantIdentifier }) => {
  // On Web, we don't use the native StripeProvider. 
  // We just return children because we'll use Stripe.js or our custom mock for the "Best Popup" experience.
  if (Platform.OS === 'web' || !publishableKey) {
    return <>{children}</>;
  }
  
  // Only attempt to require the native SDK on Android/iOS
  try {
    const { StripeProvider: RealStripeProvider } = require('@stripe/stripe-react-native');
    return (
      <RealStripeProvider
        publishableKey={publishableKey}
        merchantIdentifier={merchantIdentifier}
      >
        {children}
      </RealStripeProvider>
    );
  } catch (e) {
    console.warn('Stripe Native SDK not found, falling back to mock.');
    return <>{children}</>;
  }
};
