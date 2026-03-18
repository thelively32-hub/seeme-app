import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

export default function BusinessDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadBusiness();
  }, [id]);

  const loadBusiness = async () => {
    try {
      const businesses = await api.getMyBusinesses();
      const found = businesses.find((b: any) => b.id === id);
      setBusiness(found);
    } catch (error) {
      console.error('Failed to load business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Únete a ${business?.name} en SEE ME! Escanea el código QR cuando llegues para hacer check-in.`,
        title: `${business?.name} en SEE ME`,
      });
    } catch (error) {
      console.error('Share failed:', error);
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

  if (!business) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.errorText}>Local no encontrado</Text>
        </View>
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
        <Text style={styles.headerTitle}>Mi QR</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={COLORS.gold.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Info */}
        <View style={styles.businessInfo}>
          <View style={styles.businessIcon}>
            <Ionicons name="storefront" size={32} color={COLORS.gold.primary} />
          </View>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessType}>{business.type}</Text>
          <Text style={styles.businessAddress}>{business.address}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={business.qr_code_data}
                size={220}
                backgroundColor="#FFFFFF"
                color="#000000"
                getRef={(ref) => (qrRef.current = ref)}
              />
            </View>
            <Text style={styles.qrLabel}>SEE ME Partner</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Cómo usar tu QR</Text>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionText}>
                Imprime este código QR y colócalo en un lugar visible de tu local
              </Text>
            </View>
          </View>

          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionText}>
                Los usuarios de SEE ME lo escanearán al llegar para hacer check-in
              </Text>
            </View>
          </View>

          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionText}>
                Tu local aparecerá activo en el mapa y atraerá más clientes
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        {(business.phone || business.email) && (
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Información de contacto</Text>
            {business.phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={18} color={COLORS.text.tertiary} />
                <Text style={styles.contactText}>{business.phone}</Text>
              </View>
            )}
            {business.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={18} color={COLORS.text.tertiary} />
                <Text style={styles.contactText}>{business.email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Download/Print Button */}
        <TouchableOpacity style={styles.downloadButton} onPress={handleShare}>
          <LinearGradient
            colors={COLORS.gradients.goldButton as [string, string, string]}
            style={styles.downloadButtonGradient}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.text.dark} />
            <Text style={styles.downloadButtonText}>Compartir QR</Text>
          </LinearGradient>
        </TouchableOpacity>
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
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text.muted,
    marginTop: 16,
  },
  businessInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  businessIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  businessType: {
    fontSize: 15,
    color: COLORS.gold.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  qrWrapper: {
    padding: 16,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold.dark,
    marginTop: 16,
    letterSpacing: 2,
  },
  instructionsCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  instructionsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  instruction: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  instructionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  downloadButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  downloadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
});
