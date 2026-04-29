import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSSO, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Mail, Lock, ChevronRight, Eye, EyeOff, User } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { env } from '../lib/env';

WebBrowser.maybeCompleteAuthSession();

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const formatClerkError = (error, t) => {
  const clerkError = error?.errors?.[0];
  if (clerkError) {
    return clerkError.longMessage || clerkError.message;
  }
  return error?.message || t('auth.error_auth_generic');
};

export const LoginScreen = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const redirectUrl = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: env.appScheme,
        path: 'oauth-native-callback',
      }),
    []
  );

  const isReady = signInLoaded && signUpLoaded;

  const resetSignupStep = () => {
    setNeedsVerification(false);
    setVerificationCode('');
  };

  const toggleAuthMode = () => {
    setIsLogin((current) => !current);
    setErrorMessage('');
    resetSignupStep();
  };

  const handleEmailAuth = async () => {
    if (!isReady) {
      setErrorMessage(t('auth.service_initializing'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (isLogin) {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
        } else {
          // If the status is not complete, it might be because verification is needed
          // even during sign-in (e.g., if signup was abandoned)
          console.log('Incomplete sign-in:', result.status);
          setErrorMessage(`SignIn incomplete: ${result.status}. If you haven't verified your email yet, please try the Sign Up flow.`);
        }
      } else if (!needsVerification) {
        // First step of Sign Up: Create account
        const { firstName, lastName } = splitName(name);

        const result = await signUp.create({
          emailAddress: email.trim(),
          password,
          firstName,
          lastName,
        });

        // Prepare verification (sends the email)
        await signUp.prepareEmailAddressVerification({
          strategy: 'email_code',
        });

        setNeedsVerification(true);
      } else {
        // Second step of Sign Up: Verify code
        const result = await signUp.attemptEmailAddressVerification({
          code: verificationCode.trim(),
        });

        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
        } else {
          setErrorMessage(`Verification incomplete: ${result.status}`);
        }
      }
    } catch (error) {
      console.error('[Clerk Auth Error]:', error);
      const formattedError = formatClerkError(error, t);
      setErrorMessage(formattedError);
      
      // If the error says the user already exists during signup, 
      // it might be because they need to verify an existing account.
      if (!isLogin && !needsVerification && formattedError.toLowerCase().includes('already exists')) {
        setErrorMessage('This account already exists. Please Sign In instead or use Google Login.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      setErrorMessage('Verification code resent to your email.');
    } catch (error) {
      setErrorMessage(formatClerkError(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isReady) {
      setErrorMessage(t('auth.service_initializing'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error) {
      setErrorMessage(formatClerkError(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isLogin
    ? t('auth.sign_in_btn')
    : needsVerification
      ? t('auth.verify_btn')
      : t('auth.sign_up_btn');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.bgDecorLarge} />
      <View style={styles.bgDecorSmall} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {isLogin ? t('auth.welcome') : needsVerification ? t('auth.verify_email') : t('auth.create_account')}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? t('auth.sign_in_sub')
                : needsVerification
                  ? t('auth.verify_sub', { email })
                  : t('auth.sign_up_sub')}
            </Text>
          </View>

          <View style={styles.formCard}>
            {!isLogin && !needsVerification && (
              <View style={styles.inputField}>
                <View style={styles.inputIconGroup}>
                   <User size={18} color={colors.primary} />
                   <Text style={styles.inputPlaceholder}>{t('auth.full_name')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Elena Rodriguez"
                  placeholderTextColor="rgba(74,68,83,0.3)"
                />
                <View style={styles.inputBorder} />
              </View>
            )}

            {!needsVerification && (
              <View style={[styles.inputField, !isLogin && { marginTop: 32 }]}>
                <View style={styles.inputIconGroup}>
                  <Mail size={18} color={colors.primary} />
                  <Text style={styles.inputPlaceholder}>{t('auth.email')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(74,68,83,0.3)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.inputBorder} />
              </View>
            )}

            {!needsVerification ? (
              <View style={styles.inputField}>
                <View style={styles.inputIconGroup}>
                  <Lock size={18} color={colors.primary} />
                  <Text style={styles.inputPlaceholder}>{t('auth.password')}</Text>
                </View>
                <View style={styles.passRow}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="********"
                    placeholderTextColor="rgba(74,68,83,0.3)"
                    secureTextEntry={!showPass}
                  />
                  <Pressable onPress={() => setShowPass((current) => !current)}>
                    {showPass ? (
                      <Eye size={20} color={colors.primary} />
                    ) : (
                      <EyeOff size={20} color="rgba(74,68,83,0.3)" />
                    )}
                  </Pressable>
                </View>
                <View style={styles.inputBorder} />
              </View>
            ) : (
              <View style={styles.inputField}>
                <View style={styles.inputIconGroup}>
                  <Lock size={18} color={colors.primary} />
                  <Text style={styles.inputPlaceholder}>{t('auth.verification_code')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="123456"
                  placeholderTextColor="rgba(74,68,83,0.3)"
                  keyboardType="number-pad"
                  autoFocus={true}
                />
                <View style={styles.inputBorder} />
                <View style={styles.verificationActions}>
                  <Pressable onPress={handleResendCode} disabled={isSubmitting}>
                    <Text style={styles.verifyLink}>{t('auth.resend_code')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setNeedsVerification(false)} disabled={isSubmitting}>
                    <Text style={styles.verifyLink}>{t('auth.change_email')}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              style={[
                styles.primaryButton, 
                (isSubmitting || !isReady) && styles.buttonDisabled
              ]}
              onPress={handleEmailAuth}
              disabled={isSubmitting || !isReady}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.on_primary} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{submitLabel}</Text>
                  <View style={styles.arrowCircle}>
                    <ChevronRight size={20} color={colors.on_primary} />
                  </View>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.socialSection}>
            <Text style={styles.socialHint}>{t('auth.google_signin')}</Text>
            <Pressable
              style={[styles.googleButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                style={styles.socialLogo}
              />
              <Text style={styles.googleButtonText}>{t('auth.google_signin')}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? t('auth.no_account') : t('auth.have_account')}
            </Text>
            <Pressable onPress={toggleAuthMode}>
              <Text style={styles.footerLink}>{isLogin ? t('auth.switch_signup') : t('auth.switch_signin')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgDecorLarge: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.primary_container,
    opacity: 0.3,
  },
  bgDecorSmall: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.secondary,
    opacity: 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
  },
  titleContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    color: colors.on_surface,
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.on_surface_variant,
    lineHeight: 24,
    opacity: 0.8,
  },
  formCard: {
    paddingVertical: 20,
    gap: 24,
  },
  inputField: {
    width: '100%',
  },
  inputIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputPlaceholder: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: colors.on_surface_variant,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 17,
    color: colors.on_surface,
    paddingVertical: 12,
  },
  inputBorder: {
    height: 1,
    backgroundColor: 'rgba(74,68,83,0.1)',
    width: '100%',
  },
  passRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#D74B4B',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    borderRadius: 36,
    marginTop: 16,
    ...Platform.select({
      native: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
      },
      web: {
        boxShadow: '0 15px 25px rgba(120, 81, 169, 0.25)',
      },
    }),
  },
  primaryButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_primary,
    letterSpacing: 2,
    marginRight: 16,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74,68,83,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  socialHint: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    marginBottom: 20,
  },
  googleButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EFEFE7',
    ...Platform.select({
      native: {
        shadowColor: '#4A4453',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      },
      web: {
        boxShadow: '0 5px 10px rgba(74, 68, 83, 0.05)',
      },
    }),
  },
  socialLogo: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  googleButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.on_surface,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 54,
  },
  footerText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface_variant,
  },
  footerLink: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  verifyLink: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
