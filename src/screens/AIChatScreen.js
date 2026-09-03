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
  Alert,
} from 'react-native';
import { ChevronLeft, Send, Sparkles, User, Bot, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { getGeminiChatResponse } from '../services/aiService';
import { loadMealHistory } from '../services/mealAnalysisService';
import { loadRecentChatHistory, saveChatMessage } from '../services/chatHistoryService';

const { width } = Dimensions.get('window');

// How much recent history to fold into every chat message's context —
// enough for the model to see a real trend, not so much the prompt balloons.
const RECENT_LOGS_COUNT = 5;
const RECENT_MEALS_COUNT = 5;

export const AIChatScreen = ({ onBack, onNavigate, cycleInfo, cycleProfile = {}, user, dailyLogs = [], getToken, isPremium }) => {
  const { t } = useTranslation();
  const phaseKey = cycleInfo?.currentPhaseKey || 'follicular';
  const [mealHistory, setMealHistory] = useState([]);

  useEffect(() => {
    if (!isPremium || !user?.id) return;
    let isMounted = true;
    loadMealHistory(getToken, user.id, RECENT_MEALS_COUNT).then((rows) => {
      if (isMounted) setMealHistory(rows);
    });
    return () => { isMounted = false; };
  }, [isPremium, user?.id]);
  // Was interpolating the raw internal phase key (e.g. "follicular") straight
  // into the Spanish sentence, untranslated. Now uses the actual translated
  // phase name plus a short phase-specific energy note. Extracted so
  // handleClearChat can rebuild the same greeting bubble.
  const buildGreeting = () => ({
    id: `greeting-${Date.now()}`,
    role: 'model',
    text: t('chat.initial_greeting', {
      phase: t(`phases.${phaseKey}`),
      energy: t(`chat.phase_energy.${phaseKey}`),
    }),
    isGreeting: true,
  });

  const [messages, setMessages] = useState(() => [buildGreeting()]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();
  // Guards against the history load (async, fires on mount) landing AFTER
  // the user has already sent a message — without this, setMessages(rows)
  // below would overwrite the just-sent message (and its optimistic bubble)
  // with the stale pre-load history, silently dropping what they typed.
  const hasSentRef = useRef(false);

  // Resume a real conversation across app sessions instead of always
  // starting fresh with just the greeting — the greeting bubble stays only
  // when there's genuinely no prior history yet.
  useEffect(() => {
    if (!isPremium || !user?.id) return;
    let isMounted = true;
    loadRecentChatHistory(getToken, user.id).then((rows) => {
      if (isMounted && rows.length > 0 && !hasSentRef.current) setMessages(rows);
    });
    return () => { isMounted = false; };
  }, [isPremium, user?.id]);

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;
    hasSentRef.current = true;

    const sentText = inputText;
    const userMessage = { id: Date.now().toString(), role: 'user', text: sentText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    if (user?.id) saveChatMessage(getToken, user.id, 'user', sentText);

    // Prepare history for Gemini.
    // The seeded greeting bubble is UI-only (role: 'model') and is never sent to
    // Gemini — aiService already opens the chat with its own user/model turn pair,
    // so including this greeting would put two 'model' turns back to back and Gemini
    // rejects that with a 400 (roles must strictly alternate user/model).
    const history = messages
      .filter((m) => !m.isGreeting)
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    const responseText = await getGeminiChatResponse(history, sentText, {
      currentPhase: cycleInfo?.currentPhaseKey,
      day: cycleInfo?.cycleDay,
      userName: user?.firstName || user?.fullName,
      cycleLength: cycleProfile?.cycleLength ?? cycleProfile?.cycle_length,
      periodLength: cycleProfile?.periodLength ?? cycleProfile?.period_length,
      recentLogs: dailyLogs.slice(0, RECENT_LOGS_COUNT).map((l) => ({
        date: l.log_date || l.logged_at,
        mood: l.mood,
        energyLevel: l.energy_level,
        symptoms: l.symptoms,
      })),
      recentMeals: mealHistory.map((m) => ({
        date: m.loggedAt,
        items: (m.items || []).map((i) => i.name),
        calories: Math.round(m.totalCalories),
        protein: Math.round(m.totalProtein),
        carbs: Math.round(m.totalCarbs),
        fat: Math.round(m.totalFat),
      })),
    });

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: 'model', text: responseText },
    ]);
    if (user?.id) saveChatMessage(getToken, user.id, 'model', responseText);
    setIsTyping(false);
  };

  // Clears only what's shown on screen right now — never touches
  // ai_chat_messages in Supabase, so the saved history (and the 30-day
  // retention job) is completely unaffected. Reopening this screen later
  // loads the real history again from the database, same as always; this
  // just resets the current view back to a fresh greeting.
  const handleClearChat = () => {
    Alert.alert(
      t('chat.clear_chat_title'),
      t('chat.clear_chat_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.clear_chat_confirm'),
          style: 'destructive',
          onPress: () => {
            hasSentRef.current = true;
            setMessages([buildGreeting()]);
          },
        },
      ]
    );
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
        <Pressable style={styles.upgradeBtn} onPress={() => onNavigate('subscription')}>
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
        <Pressable
          onPress={handleClearChat}
          style={styles.clearButton}
          disabled={messages.length <= 1}
          hitSlop={8}
        >
          <Trash2 size={18} color={messages.length <= 1 ? colors.placeholder : colors.on_surface_variant} />
        </Pressable>
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
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
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
