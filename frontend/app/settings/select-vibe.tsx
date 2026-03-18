import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import { VIBES, VIBE_CATEGORIES, VibeType } from '../../src/constants/vibes';

export default function SelectVibeScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.default_vibe_id) {
      setSelectedVibe(user.default_vibe_id);
    }
  }, [user]);

  const handleSave = async () => {
    if (!selectedVibe) return;
    
    setSaving(true);
    try {
      await api.updateDefaultVibe(selectedVibe);
      await refreshUser();
      router.back();
    } catch (error) {
      console.error('Failed to save vibe:', error);
    } finally {
      setSaving(false);
    }
  };

  const getVibesByCategory = (categoryId: string) => {
    return VIBES.filter(v => v.category === categoryId);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Vibe</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={!selectedVibe || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.gold.primary} />
          ) : (
            <Text style={[styles.saveText, !selectedVibe && styles.saveTextDisabled]}>
              Guardar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Este es el vibe que se mostrará cuando hagas check-in en un lugar.
          Puedes cambiarlo en cualquier momento.
        </Text>

        {VIBE_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryTitle}>{category.labelEs}</Text>
            </View>
            
            <View style={styles.vibesGrid}>
              {getVibesByCategory(category.id).map((vibe) => (
                <TouchableOpacity
                  key={vibe.id}
                  style={[
                    styles.vibeCard,
                    selectedVibe === vibe.id && {
                      backgroundColor: `${vibe.color}20`,
                      borderColor: vibe.color,
                    },
                  ]}
                  onPress={() => setSelectedVibe(vibe.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.vibeEmoji}>{vibe.icon}</Text>
                  <Text style={[
                    styles.vibeLabel,
                    selectedVibe === vibe.id && { color: vibe.color },
                  ]}>
                    {vibe.labelEs}
                  </Text>
                  {selectedVibe === vibe.id && (
                    <View style={[styles.checkMark, { backgroundColor: vibe.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Preview */}
        {selectedVibe && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Vista previa</Text>
            <View style={styles.previewCard}>
              {(() => {
                const vibe = VIBES.find(v => v.id === selectedVibe);
                if (!vibe) return null;
                return (
                  <>
                    <Text style={styles.previewEmoji}>{vibe.icon}</Text>
                    <View>
                      <Text style={[styles.previewName, { color: vibe.color }]}>
                        {vibe.labelEs}
                      </Text>
                      <Text style={styles.previewMessage}>
                        &quot;{vibe.defaultMessageEs}&quot;
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
  saveTextDisabled: {
    color: COLORS.text.muted,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  description: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 28,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  vibesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vibeCard: {
    width: '30%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.background.card,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    position: 'relative',
  },
  vibeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  vibeLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  checkMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  previewTitle: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewEmoji: {
    fontSize: 44,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewMessage: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
