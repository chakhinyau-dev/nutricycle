import React from 'react';

// This is the Web-specific version of the StripeWrapper.
// It avoids importing @stripe/stripe-react-native to prevent bundling errors in the browser.
export const StripeProvider = ({ children }) => {
  return <>{children}</>;
};
