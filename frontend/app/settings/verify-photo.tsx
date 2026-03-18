import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

export default function VerifyPhotoScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const cameraRef = useRef<any>(null);

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      try {
        const result = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });
        setPhoto(result.uri);
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'No se pudo tomar la foto');
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const handleSubmit = async () => {
    if (!photo) return;
    
    setSubmitting(true);
    try {
      // For demo, we just send a placeholder
      await api.submitPhotoVerification('photo_base64_placeholder');
      Alert.alert(
        'Enviado',
        'Tu foto de verificacion ha sido enviada. Te notificaremos cuando sea revisada.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la verificacion');
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
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
            <Text style={styles.permissionTitle}>Acceso a Camara</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a tu camara para tomar una selfie de verificacion.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.permissionButtonGradient}
              >
                <Text style={styles.permissionButtonText}>Permitir Camara</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photo ? (
        // Preview mode
        <>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} />
          <View style={[styles.overlay, { paddingTop: insets.top + 10 }]}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <View style={styles.closeButtonBg}>
                  <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.spacer} />
            
            <View style={[styles.previewActions, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={24} color={COLORS.text.primary} />
                <Text style={styles.retakeText}>Volver a tomar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <LinearGradient
                  colors={COLORS.gradients.goldButton as [string, string, string]}
                  style={styles.submitButtonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.text.dark} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={24} color={COLORS.text.dark} />
                      <Text style={styles.submitText}>Enviar</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        // Camera mode
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />
          <View style={[styles.overlay, { paddingTop: insets.top + 10 }]}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <View style={styles.closeButtonBg}>
                  <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </View>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Verificacion de foto</Text>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}
              >
                <View style={styles.closeButtonBg}>
                  <Ionicons name="camera-reverse" size={24} color={COLORS.text.primary} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.faceGuide}>
              <View style={styles.faceCircle} />
              <Text style={styles.guideText}>
                Coloca tu rostro dentro del circulo
              </Text>
            </View>
            
            <View style={[styles.cameraActions, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                  Toma una selfie clara con buena iluminacion
                </Text>
              </View>
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </>
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
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  faceGuide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceCircle: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: COLORS.gold.primary,
    borderStyle: 'dashed',
  },
  guideText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.text.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  spacer: {
    flex: 1,
  },
  cameraActions: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructions: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 15,
    color: COLORS.text.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.text.primary,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  retakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 24,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  permissionButton: {
    marginTop: 32,
    borderRadius: 30,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
});
