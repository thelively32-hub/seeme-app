import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../theme/colors';
import api from '../services/api';
import { useLanguage } from '../i18n';

const { width } = Dimensions.get('window');
const MAX_CHARS = 60;

interface PredefinedMessage {
  key: string;
  text: string;
  type: string;
}

interface VibeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSend: (vibeType: string, message: string) => void;
  recipientName: string;
  sending?: boolean;
  vibesUsed?: number; // how many vibes already sent to this person
  isPremium?: boolean;
}

export default function VibeSelector({
  visible,
  onClose,
  onSend,
  recipientName,
  sending = false,
  vibesUsed = 0,
  isPremium = false,
}: VibeSelectorProps) {
  const { language } = useLanguage();
  const [predefined, setPredefined] = useState<PredefinedMessage[]>([]);
  const [selected, setSelected] = useState<PredefinedMessage | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  const vibesRemaining = isPremium ? '∞' : Math.max(0, 3 - vibesUsed);
  const canSend = isPremium || vibesUsed < 3;
  const message = isCustom ? customMessage : (selected?.text || '');

  useEffect(() => {
    if (visible) {
      loadMessages();
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      setSelected(null);
      setCustomMessage('');
      setIsCustom(false);
    }
  }, [visible]);

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const data = await api.getPredefinedVibeMessages(language);
      setPredefined(data?.messages || []);
    } catch {
      // Fallback hardcoded if API fails
      setPredefined(language === 'es' ? [
        { key: 'drink',  text: '¿Una copa? 🍻',       type: 'drink' },
        { key: 'meet',   text: 'Quiero conocerte ✨',  type: 'wave' },
        { key: 'join',   text: '¡Únete! 🔥',           type: 'dance' },
        { key: 'coffee', text: '¿Un café? ☕',         type: 'coffee' },
        { key: 'vibe',   text: 'Buena vibra 💛',       type: 'wink' },
        { key: 'chat',   text: 'Hablamos 💬',          type: 'wave' },
      ] : [
        { key: 'drink',  text: 'Grab a drink? 🍻',    type: 'drink' },
        { key: 'meet',   text: 'Wants to meet ✨',     type: 'wave' },
        { key: 'join',   text: 'Join us! 🔥',          type: 'dance' },
        { key: 'coffee', text: 'Coffee? ☕',           type: 'coffee' },
        { key: 'vibe',   text: 'Good vibe 💛',         type: 'wink' },
        { key: 'chat',   text: "Let's talk 💬",        type: 'wave' },
      ]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = () => {
    if (!canSend || !message.trim()) return;
    onSend(selected?.type || 'wave', message.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modal, {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          opacity: fadeAnim,
        }]}>
          {/* Header */}
          <LinearGradient colors={[COLORS.background.card, COLORS.background.secondary]} style={styles.header}>
            <View style={styles.headerContent}>
              <LinearGradient colors={[COLORS.gold.primary, COLORS.gold.secondary]} style={styles.headerBadge}>
                <Ionicons name="sparkles" size={16} color="#000" />
              </LinearGradient>
              <View>
                <Text style={styles.title}>
                  {language === 'es' ? 'Enviar Vibe' : 'Send Vibe'}
                </Text>
                <Text style={styles.subtitle}>
                  {language === 'es' ? `a ${recipientName}` : `to ${recipientName}`}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {/* Vibes remaining counter */}
              <View style={[styles.counterBadge, !canSend && styles.counterBadgeEmpty]}>
                <Text style={styles.counterText}>{vibesRemaining}</Text>
                <Text style={styles.counterLabel}>
                  {language === 'es' ? 'vibes' : 'vibes'}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {!canSend ? (
            /* No vibes remaining */
            <View style={styles.noVibesContainer}>
              <Text style={styles.noVibesEmoji}>💫</Text>
              <Text style={styles.noVibesTitle}>
                {language === 'es' ? 'Sin vibes disponibles' : 'No vibes left'}
              </Text>
              <Text style={styles.noVibesSubtitle}>
                {language === 'es'
                  ? `Ya enviaste 3 vibes a ${recipientName}. Hazte Premium para vibes ilimitados.`
                  : `You've sent 3 vibes to ${recipientName}. Go Premium for unlimited vibes.`}
              </Text>
              <TouchableOpacity style={styles.premiumBtn} onPress={onClose}>
                <Text style={styles.premiumBtnText}>
                  {language === 'es' ? 'Ver Premium 👑' : 'Go Premium 👑'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Predefined messages */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {language === 'es' ? 'Elige tu mensaje' : 'Choose your message'}
                </Text>
                {loadingMessages ? (
                  <ActivityIndicator color={COLORS.gold.primary} style={{ marginVertical: 16 }} />
                ) : (
                  <View style={styles.messagesGrid}>
                    {predefined.map(m => (
                      <TouchableOpacity
                        key={m.key}
                        style={[styles.messagePill, selected?.key === m.key && !isCustom && styles.messagePillActive]}
                        onPress={() => { setSelected(m); setIsCustom(false); setCustomMessage(''); }}
                      >
                        <Text style={[styles.messagePillText, selected?.key === m.key && !isCustom && styles.messagePillTextActive]}>
                          {m.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Custom option */}
                    <TouchableOpacity
                      style={[styles.messagePill, isCustom && styles.messagePillActive]}
                      onPress={() => { setIsCustom(true); setSelected(null); }}
                    >
                      <Text style={[styles.messagePillText, isCustom && styles.messagePillTextActive]}>
                        ✏️ {language === 'es' ? 'Personalizar' : 'Custom'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Custom message input */}
              {isCustom && (
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={styles.customInput}
                    value={customMessage}
                    onChangeText={t => setCustomMessage(t.slice(0, MAX_CHARS))}
                    placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Write your message...'}
                    placeholderTextColor={COLORS.text.muted}
                    maxLength={MAX_CHARS}
                    autoFocus
                  />
                  <Text style={[styles.charCount, customMessage.length >= MAX_CHARS && styles.charCountMax]}>
                    {customMessage.length}/{MAX_CHARS}
                  </Text>
                </View>
              )}

              {/* Message preview */}
              {message.length > 0 && (
                <View style={styles.preview}>
                  <Text style={styles.previewQuote}>"{message}"</Text>
                </View>
              )}

              {/* Send button */}
              <View style={styles.sendContainer}>
                <TouchableOpacity
                  style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!message.trim() || sending}
                >
                  <LinearGradient
                    colors={message.trim() ? [COLORS.gold.primary, COLORS.gold.secondary] : ['#333', '#222']}
                    style={styles.sendGradient}
                  >
                    {sending ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={20} color={message.trim() ? '#000' : '#666'} />
                        <Text style={[styles.sendText, !message.trim() && styles.sendTextDisabled]}>
                          {language === 'es' ? 'ENVIAR VIBE' : 'SEND VIBE'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

interface VibeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSend: (vibeId: string, message: string) => void;
  recipientName: string;
  sending?: boolean;
}

// Category Section with Premium Icons
const CategorySection = ({
  category,
  selectedVibe,
  onSelectVibe,
}: {
  category: typeof VIBE_CATEGORIES[0];
  selectedVibe: VibeType | null;
  onSelectVibe: (vibe: VibeType) => void;
}) => {
  const vibes = getVibesByCategory(category.id as VibeType['category']);

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <LinearGradient
          colors={[COLORS.gold.primary, COLORS.gold.secondary]}
          style={styles.categoryIconBg}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
        </LinearGradient>
        <Text style={styles.categoryTitle}>{category.labelEs}</Text>
      </View>
      <View style={styles.vibesGrid}>
        {vibes.map((vibe) => (
          <View key={vibe.id} style={styles.vibeWrapper}>
            <PremiumVibeIcon
              vibe={vibe}
              size="medium"
              selected={selectedVibe?.id === vibe.id}
              onPress={() => onSelectVibe(vibe)}
              animated={selectedVibe?.id === vibe.id}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default function VibeSelector({
  visible,
  onClose,
  onSend,
  recipientName,
  sending = false,
}: VibeSelectorProps) {
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      setSelectedVibe(null);
      setCustomMessage('');
      setShowCustomInput(false);
    }
  }, [visible]);

  const handleSelectVibe = (vibe: VibeType) => {
    setSelectedVibe(vibe);
    setCustomMessage(vibe.defaultMessageEs);
  };

  const handleSend = () => {
    if (selectedVibe) {
      onSend(selectedVibe.id, customMessage || selectedVibe.defaultMessageEs);
    }
  };

  const getMessage = () => {
    if (customMessage) return customMessage;
    if (selectedVibe) return selectedVibe.defaultMessageEs;
    return '';
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modal,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Premium Header */}
          <LinearGradient
            colors={[COLORS.background.card, COLORS.background.secondary]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerBadge}>
                <LinearGradient
                  colors={[COLORS.gold.primary, COLORS.gold.secondary]}
                  style={styles.headerBadgeGradient}
                >
                  <Ionicons name="sparkles" size={16} color="#000" />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.title}>Enviar Vibe</Text>
                <Text style={styles.subtitle}>a {recipientName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Vibes Grid */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {VIBE_CATEGORIES.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                selectedVibe={selectedVibe}
                onSelectVibe={handleSelectVibe}
              />
            ))}
          </ScrollView>

          {/* Selected Vibe Preview */}
          {selectedVibe && (
            <Animated.View 
              style={[
                styles.preview,
              ]}
            >
              <LinearGradient
                colors={[`${selectedVibe.color}20`, `${selectedVibe.color}05`]}
                style={styles.previewGradient}
              >
                <View style={styles.previewHeader}>
                  <View style={styles.previewVibeContainer}>
                    <PremiumVibeIcon
                      vibe={selectedVibe}
                      size="small"
                      selected
                      showLabel={false}
                      animated={false}
                    />
                  </View>
                  <View style={styles.previewInfo}>
                    <Text style={[styles.previewLabel, { color: selectedVibe.color }]}>
                      {selectedVibe.labelEs}
                    </Text>
                    <TouchableOpacity onPress={() => setShowCustomInput(!showCustomInput)}>
                      <Text style={styles.editLink}>
                        {showCustomInput ? '↩ Usar original' : '✏️ Personalizar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showCustomInput ? (
                  <TextInput
                    style={styles.customInput}
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor={COLORS.text.muted}
                    maxLength={100}
                    multiline
                  />
                ) : (
                  <Text style={styles.previewMessage}>"{getMessage()}"</Text>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {/* Premium Send Button */}
          <View style={styles.sendButtonContainer}>
            <TouchableOpacity
              style={[styles.sendButton, !selectedVibe && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!selectedVibe || sending}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  selectedVibe
                    ? [COLORS.gold.primary, COLORS.gold.secondary, '#B8860B']
                    : ['#3A3A3A', '#2A2A2A']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                {sending ? (
                  <Text style={styles.sendButtonText}>Enviando...</Text>
                ) : selectedVibe ? (
                  <View style={styles.sendButtonContent}>
                    <Text style={styles.sendButtonEmoji}>{selectedVibe.icon}</Text>
                    <Text style={styles.sendButtonText}>Enviar Vibe</Text>
                    <Ionicons name="paper-plane" size={18} color="#000" />
                  </View>
                ) : (
                  <Text style={styles.sendButtonTextDisabled}>Selecciona un Vibe</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  modal: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  subtitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 1 },
  counterBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  counterBadgeEmpty: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderColor: 'rgba(255,0,0,0.3)',
  },
  counterText: { fontSize: 16, fontWeight: '800', color: COLORS.gold.primary },
  counterLabel: { fontSize: 9, color: COLORS.text.muted, letterSpacing: 1 },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  messagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  messagePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  messagePillActive: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: COLORS.gold.primary,
  },
  messagePillText: { fontSize: 14, color: COLORS.text.secondary, fontWeight: '500' },
  messagePillTextActive: { color: COLORS.gold.primary, fontWeight: '700' },
  customInputContainer: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold.primary,
    padding: 14,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountMax: { color: '#FF5533' },
  preview: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(255,215,0,0.07)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold.primary,
  },
  previewQuote: {
    fontSize: 15,
    color: COLORS.gold.primary,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  sendContainer: { paddingHorizontal: 20, paddingTop: 20 },
  sendButton: { borderRadius: 16, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.4 },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  sendText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 1 },
  sendTextDisabled: { color: '#666' },
  noVibesContainer: { alignItems: 'center', padding: 32 },
  noVibesEmoji: { fontSize: 48, marginBottom: 12 },
  noVibesTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8 },
  noVibesSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  premiumBtn: {
    backgroundColor: COLORS.gold.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  premiumBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
