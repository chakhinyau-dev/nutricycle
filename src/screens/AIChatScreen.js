import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ChevronLeft, Send, Sparkles, User, Bot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { getGeminiChatResponse } from '../services/aiService';

const { width } = Dimensions.get('window');

export const AIChatScreen = ({ onBack, cycleInfo, isPremium }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'model',
      text: t('chat.initial_greeting', { phase: cycleInfo?.currentPhaseKey || '' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Prepare history for Gemini
    const history = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const responseText = await getGeminiChatResponse(history, inputText, {
      currentPhase: cycleInfo?.currentPhaseKey,
      day: cycleInfo?.cycleDay,
    });

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: 'model', text: responseText },
    ]);
    setIsTyping(false);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  if (!isPremium) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockIconBox}>
          <Sparkles size={48} color={colors.primary} />
        </View>
        <Text style={styles.lockedTitle}>{t('chat.locked_title')}</Text>
        <Text style={styles.lockedSubtitle}>{t('chat.locked_sub')}</Text>
        <Pressable style={styles.upgradeBtn} onPress={onBack}>
          <Text style={styles.upgradeBtnText}>{t('chat.discover_pro')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.on_surface} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('chat.title')}</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t('ai.powered_by')}</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.messageWrapper,
              m.role === 'user' ? styles.userWrapper : styles.botWrapper,
            ]}
          >
            <View style={[styles.avatar, m.role === 'user' ? styles.userAvatar : styles.botAvatar]}>
              {m.role === 'user' ? (
                <User size={16} color="#FFF" />
              ) : (
                <Bot size={16} color={colors.primary} />
              )}
            </View>
            <View
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.botBubble,
              ]}
            >
              <Text style={[styles.messageText, m.role === 'user' && styles.userText]}>
                {m.text}
              </Text>
            </View>
          </View>
        ))}
        {isTyping && (
          <View style={[styles.messageWrapper, styles.botWrapper]}>
            <View style={[styles.avatar, styles.botAvatar]}>
              <Bot size={16} color={colors.primary} />
            </View>
            <View style={[styles.bubble, styles.botBubble, { paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.placeholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <Send size={20} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1E8',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 14,
    color: colors.on_surface,
    letterSpacing: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  onlineText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 40,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
    maxWidth: '85%',
  },
  userWrapper: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botWrapper: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  userAvatar: {
    backgroundColor: '#1A1A1A',
    marginLeft: 10,
  },
  botAvatar: {
    backgroundColor: '#F0F9FF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F1E8',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
    lineHeight: 22,
  },
  userText: {
    color: '#FFF',
  },
  inputArea: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F1E8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F1E8',
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.on_surface,
    maxHeight: 120,
    paddingTop: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  lockIconBox: {
    width: 100,
    height: 100,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  lockedTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    color: colors.on_surface,
    marginBottom: 16,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FFF',
  },
});
