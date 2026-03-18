import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';
import COLORS from '../src/theme/colors';
import { VIBES, getVibeById } from '../src/constants/vibes';

const { width, height } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showVibeConfirm, setShowVibeConfirm] = useState(false);
  const [scannedPlace, setScannedPlace] = useState<any>(null);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  useEffect(() => {
    // Load user's default vibe
    if (user?.default_vibe_id) {
      setSelectedVibe(user.default_vibe_id);
    }
  }, [user]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);

    try {
      // Check if it's a valid SEE ME QR
      if (!data.startsWith('seeme://place/')) {
        Alert.alert(
          'Código inválido',
          'Este no es un código QR de SEE ME.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      const placeId = data.replace('seeme://place/', '');
      
      // Get place info first
      const placeInfo = await api.getPlaceById(placeId);
      setScannedPlace({
        id: placeId,
        name: placeInfo?.name || 'Local',
        qr_data: data,
      });
      
      // Show vibe confirmation
      setShowVibeConfirm(true);
      setProcessing(false);
      
    } catch (error: any) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No se pudo procesar el código QR',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      setProcessing(false);
    }
  };

  const handleConfirmCheckin = async (keepVibe: boolean) => {
    if (!scannedPlace) return;
    
    setProcessing(true);
    try {
      const vibeToUse = keepVibe ? selectedVibe : null;
      
      const result = await api.qrCheckin(scannedPlace.qr_data, vibeToUse);
      
      // Save as default if they confirmed
      if (vibeToUse && keepVibe) {
        await api.updateDefaultVibe(vibeToUse);
      }
      
      await refreshUser();
      
      Alert.alert(
        '¡Check-in exitoso! 🎉',
        `Estás en ${result.place_name}`,
        [{
          text: 'Ver lugar',
          onPress: () => router.replace(`/place/${result.place_id}`),
        }]
      );
      
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'No se pudo hacer check-in',
        [{ text: 'OK' }]
      );
    } finally {
      setProcessing(false);
      setShowVibeConfirm(false);
      setScanned(false);
    }
  };

  const handleChangeVibe = () => {
    // Navigate to vibe selector
    router.push('/settings/select-vibe');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
          
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={COLORS.gold.primary} />
            <Text style={styles.permissionTitle}>Acceso a Cámara</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a tu cámara para escanear códigos QR de los locales.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.permissionButtonGradient}
              >
                <Text style={styles.permissionButtonText}>Permitir Cámara</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const currentVibe = selectedVibe ? getVibeById(selectedVibe) : null;

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonBg}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear QR</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Scan Frame */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner indicators */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanText}>
            Apunta al código QR del local
          </Text>
        </View>

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.gold.primary} />
            <Text style={styles.infoText}>
              Escanea el código QR de un local partner de SEE ME para hacer check-in automáticamente
            </Text>
          </View>
        </View>
      </View>

      {/* Vibe Confirmation Modal */}
      {showVibeConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¡Encontrado! 📍</Text>
              <Text style={styles.modalPlace}>{scannedPlace?.name}</Text>
            </View>

            <View style={styles.vibeSection}>
              <Text style={styles.vibeQuestion}>¿Con qué vibe llegas hoy?</Text>
              
              {currentVibe ? (
                <View style={[styles.currentVibeCard, { backgroundColor: `${currentVibe.color}15`, borderColor: `${currentVibe.color}50` }]}>
                  <Text style={styles.vibeEmoji}>{currentVibe.icon}</Text>
                  <View style={styles.vibeInfo}>
                    <Text style={[styles.vibeName, { color: currentVibe.color }]}>
                      {currentVibe.labelEs}
                    </Text>
                    <Text style={styles.vibeMessage}>
                      &quot;{currentVibe.defaultMessageEs}&quot;
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noVibeCard}>
                  <Ionicons name="add-circle-outline" size={32} color={COLORS.text.muted} />
                  <Text style={styles.noVibeText}>Sin vibe configurado</Text>
                </View>
              )}

              <TouchableOpacity style={styles.changeVibeButton} onPress={handleChangeVibe}>
                <Text style={styles.changeVibeText}>Cambiar mi vibe</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.gold.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowVibeConfirm(false);
                  setScanned(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmCheckin(true)}
                disabled={processing}
              >
                <LinearGradient
                  colors={COLORS.gradients.goldButton as [string, string, string]}
                  style={styles.confirmButtonGradient}
                >
                  {processing ? (
                    <ActivityIndicator color={COLORS.text.dark} />
                  ) : (
                    <Text style={styles.confirmButtonText}>Check In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Processing Indicator */}
      {processing && !showVibeConfirm && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.gold.primary} />
          <Text style={styles.processingText}>Procesando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: 44,
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.gold.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanText: {
    marginTop: 24,
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomSection: {
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.gold.primary,
    marginBottom: 8,
  },
  modalPlace: {
    fontSize: 20,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  vibeSection: {
    marginBottom: 24,
  },
  vibeQuestion: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  currentVibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 14,
  },
  vibeEmoji: {
    fontSize: 40,
  },
  vibeInfo: {
    flex: 1,
  },
  vibeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  vibeMessage: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  noVibeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 8,
  },
  noVibeText: {
    fontSize: 16,
    color: COLORS.text.muted,
  },
  changeVibeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  changeVibeText: {
    fontSize: 15,
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: COLORS.background.card,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 30,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.primary,
  },
});
