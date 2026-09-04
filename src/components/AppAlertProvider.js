import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Client feedback: native Alert.alert popups feel out of place — the client
 * wants every one of them replaced with an in-app modal that matches the
 * app's own visual language instead. Rather than rebuild each of the ~37
 * Alert.alert call sites (across 12 screens) as its own local <Modal>, this
 * is a single global provider exposing a showAlert(title, message, buttons)
 * function with the EXACT same signature as Alert.alert — so every call
 * site only needs its import/hook swapped, not rewritten.
 *
 * Bonus: this also sidesteps a real testing-environment limitation found
 * earlier — RN's Alert.alert has no functional web implementation at all
 * (confirmed via live browser testing), so it was impossible to click
 * through any of these dialogs when testing via `expo start --web`. A real
 * <Modal> renders and is clickable in every environment, including web.
 */

const AppAlertContext = createContext(null);

export const AppAlertProvider = ({ children }) => {
  const [state, setState] = useState(null);
  // Guards against onPress firing twice if a button is double-tapped before
  // the close animation finishes.
  const handledRef = useRef(false);

  const showAlert = useCallback((title, message, buttons) => {
    handledRef.current = false;
    const normalizedButtons = buttons && buttons.length ? buttons : [{ text: 'OK' }];
    setState({ title, message, buttons: normalizedButtons });
  }, []);

  const close = useCallback(() => setState(null), []);

  const handlePress = (button) => {
    if (handledRef.current) return;
    handledRef.current = true;
    close();
    // Deferred so this modal is fully closed before onPress runs — matters
    // when onPress itself opens another alert (e.g. a "delete" confirm
    // chaining into a final "are you sure?" one) or navigates away.
    if (button.onPress) setTimeout(button.onPress, 50);
  };

  const buttonStyleFor = (style) => {
    if (style === 'cancel') return styles.cancelButton;
    if (style === 'destructive') return styles.destructiveButton;
    return styles.defaultButton;
  };
  const textStyleFor = (style) => {
    if (style === 'cancel') return styles.cancelButtonText;
    if (style === 'destructive') return styles.destructiveButtonText;
    return styles.defaultButtonText;
  };

  return (
    <AppAlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={!!state} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.grabber} />
            {state?.title ? <Text style={styles.title}>{state.title}</Text> : null}
            {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={styles.buttonList}>
              {(state?.buttons || []).map((btn, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.button,
                    buttonStyleFor(btn.style),
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[styles.buttonText, textStyleFor(btn.style)]}>{btn.text}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = () => {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within an AppAlertProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(74,68,83,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#F9F9F2',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#EFEDE4',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2DDD4',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  buttonList: {
    gap: 10,
  },
  button: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  defaultButton: {
    backgroundColor: colors.primary,
  },
  defaultButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F1F1E8',
  },
  cancelButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.on_surface_variant,
  },
  destructiveButton: {
    backgroundColor: '#FFF1F2',
  },
  destructiveButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#BE123B',
  },
  buttonText: {
    textAlign: 'center',
  },
});
