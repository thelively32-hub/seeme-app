import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

interface StatusMessage {
  id: string;
  text: string;
  textEs: string;
}

export default function StatusScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [suggestedMessages, setSuggestedMessages] = useState<StatusMessage[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [messages, presence] = await Promise.all([
        api.getSuggestedStatusMessages(),
        api.getMyPresence(),
      ]);
      setSuggestedMessages(messages);
      setCurrentStatus(presence.status_message);
      setGhostMode(presence.ghost_mode);
    } catch (error) {
      console.error('Error loading status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggested = async (msg: StatusMessage) => {
    setSaving(true);
    try {
      await api.updateStatusMessage(undefined, msg.id);
      setCurrentStatus(msg.textEs);
      await refreshUser();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleSetCustom = async () => {
    if (!customMessage.trim()) return;
    
    setSaving(true);
    try {
      await api.updateStatusMessage(customMessage.trim());
      setCurrentStatus(customMessage.trim());
      setCustomMessage('');
      await refreshUser();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    setSaving(true);
    try {
      await api.clearStatusMessage();
      setCurrentStatus(null);
      await refreshUser();
    } catch (error) {
      Alert.alert('Error', 'No se pudo limpiar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGhostMode = async (value: boolean) => {
    if (!user?.is_premium) {
      Alert.alert(
        'Funcion Premium',
        'El Modo Fantasma es exclusivo para usuarios Premium. Actualiza tu plan para activarlo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver planes', onPress: () => router.push('/settings') }
        ]
      );
      return;
    }

    try {
      await api.toggleGhostMode(value);
      setGhostMode(value);
      await refreshUser();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo cambiar el modo fantasma');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} style={{ flex: 1 }} />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Mi Estado</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        {currentStatus && (
          <View style={styles.currentStatusCard}>
            <View style={styles.currentStatusHeader}>
              <View style={styles.statusDot} />
              <Text style={styles.currentStatusLabel}>Estado actual</Text>
            </View>
            <Text style={styles.currentStatusText}>{currentStatus}</Text>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearStatus}>
              <Text style={styles.clearButtonText}>Limpiar estado</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ghost Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MODO FANTASMA</Text>
          <View style={styles.ghostModeCard}>
            <View style={styles.ghostModeInfo}>
              <View style={styles.ghostModeIcon}>
                <Ionicons name="eye-off" size={24} color={ghostMode ? COLORS.gold.primary : COLORS.text.muted} />
              </View>
              <View style={styles.ghostModeText}>
                <Text style={styles.ghostModeTitle}>Modo Fantasma</Text>
                <Text style={styles.ghostModeDesc}>
                  {ghostMode 
                    ? 'Estas invisible. Solo te ven cuando envias un Vibe.'
                    : 'Todos pueden ver tu ubicacion y estado.'
                  }
                </Text>
                {!user?.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color={COLORS.gold.primary} />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>
            <Switch
              value={ghostMode}
              onValueChange={handleToggleGhostMode}
              trackColor={{ false: COLORS.background.tertiary, true: COLORS.gold.primary }}
              thumbColor={ghostMode ? COLORS.gold.light : COLORS.text.secondary}
            />
          </View>
        </View>

        {/* Custom Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENSAJE PERSONALIZADO</Text>
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Escribe tu estado..."
              placeholderTextColor={COLORS.text.muted}
              maxLength={100}
            />
            <TouchableOpacity
              style={[styles.customButton, !customMessage.trim() && styles.customButtonDisabled]}
              onPress={handleSetCustom}
              disabled={!customMessage.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.text.dark} />
              ) : (
                <Ionicons name="checkmark" size={20} color={COLORS.text.dark} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggested Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENSAJES SUGERIDOS</Text>
          <View style={styles.suggestedGrid}>
            {suggestedMessages.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                style={[
                  styles.suggestedCard,
                  currentStatus === msg.textEs && styles.suggestedCardActive
                ]}
                onPress={() => handleSelectSuggested(msg)}
                disabled={saving}
              >
                <Text style={[
                  styles.suggestedText,
                  currentStatus === msg.textEs && styles.suggestedTextActive
                ]}>
                  {msg.textEs}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.gold.primary} />
          <Text style={styles.infoText}>
            Tu estado se muestra a otros usuarios cuando ven tu perfil o te encuentran en el radar.
          </Text>
        </View>
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
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  currentStatusCard: {
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold.primary,
  },
  currentStatusLabel: {
    fontSize: 13,
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  clearButton: {
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.gold.primary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  ghostModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  ghostModeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ghostModeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ghostModeText: {
    flex: 1,
  },
  ghostModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  ghostModeDesc: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: COLORS.background.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  customButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButtonDisabled: {
    backgroundColor: COLORS.background.tertiary,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestedCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  suggestedCardActive: {
    backgroundColor: COLORS.gold.primary,
    borderColor: COLORS.gold.primary,
  },
  suggestedText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  suggestedTextActive: {
    color: COLORS.text.dark,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 14,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.tertiary,
    lineHeight: 20,
  },
});
