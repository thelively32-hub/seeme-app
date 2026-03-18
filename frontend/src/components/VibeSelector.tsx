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

const { width } = Dimensions.get('window');

interface VibeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSend: (vibeId: string, message: string) => void;
  recipientName: string;
  sending?: boolean;
}

// Single Vibe Button
const VibeButton = ({
  vibe,
  selected,
  onPress,
}: {
  vibe: VibeType;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.vibeButton,
      selected && { borderColor: vibe.color, backgroundColor: `${vibe.color}15` },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.vibeEmoji}>{vibe.icon}</Text>
    <Text style={[styles.vibeLabel, selected && { color: vibe.color }]}>
      {vibe.labelEs}
    </Text>
  </TouchableOpacity>
);

// Category Section
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
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={styles.categoryTitle}>{category.labelEs}</Text>
      </View>
      <View style={styles.vibesGrid}>
        {vibes.map((vibe) => (
          <VibeButton
            key={vibe.id}
            vibe={vibe}
            selected={selectedVibe?.id === vibe.id}
            onPress={() => onSelectVibe(vibe)}
          />
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
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
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
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Send a Vibe</Text>
              <Text style={styles.subtitle}>to {recipientName}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Vibes Grid */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
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
            <View style={[styles.preview, { backgroundColor: `${selectedVibe.color}15` }]}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewEmoji}>{selectedVibe.icon}</Text>
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewLabel, { color: selectedVibe.color }]}>
                    {selectedVibe.labelEs}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCustomInput(!showCustomInput)}>
                    <Text style={styles.editLink}>
                      {showCustomInput ? 'Usar mensaje original' : 'Personalizar mensaje'}
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
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, !selectedVibe && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!selectedVibe || sending}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                selectedVibe
                  ? [selectedVibe.color, selectedVibe.color + 'CC']
                  : ['#3A3A3A', '#2A2A2A']
              }
              style={styles.sendButtonGradient}
            >
              {sending ? (
                <Text style={styles.sendButtonText}>Enviando...</Text>
              ) : (
                <>
                  <Text style={styles.sendButtonText}>
                    {selectedVibe ? `Enviar ${selectedVibe.icon}` : 'Selecciona un Vibe'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: 350,
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vibesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vibeButton: {
    width: (width - 60) / 4,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  vibeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  vibeLabel: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  preview: {
    margin: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  previewEmoji: {
    fontSize: 36,
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  editLink: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  previewMessage: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontStyle: 'italic',
  },
  customInput: {
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 50,
  },
  sendButton: {
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
