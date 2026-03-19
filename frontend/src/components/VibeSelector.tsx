import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../theme/colors';
import { VIBES, VIBE_CATEGORIES, VibeType, getVibesByCategory } from '../constants/vibes';
import PremiumVibeIcon from './PremiumVibeIcon';

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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modal: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 34,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
  },
  headerBadgeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  categoryIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  vibesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vibeWrapper: {
    width: (width - 44) / 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  previewVibeContainer: {
    // Container for the small vibe icon
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  editLink: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 3,
  },
  previewMessage: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  customInput: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  sendButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  sendButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendButtonEmoji: {
    fontSize: 20,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  sendButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
});
