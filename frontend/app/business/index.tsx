import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

export default function BusinessModeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const data = await api.getMyBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Modo Business</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <LinearGradient
            colors={['rgba(244, 197, 66, 0.15)', 'rgba(244, 197, 66, 0.05)']}
            style={styles.infoBannerGradient}
          >
            <Ionicons name="business" size={32} color={COLORS.gold.primary} />
            <Text style={styles.infoBannerTitle}>¿Tienes un local?</Text>
            <Text style={styles.infoBannerText}>
              Genera un código QR único para tu negocio y permite que los usuarios de SEE ME hagan check-in automáticamente al llegar.
            </Text>
          </LinearGradient>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/business/register')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton as [string, string, string]}
            style={styles.registerButtonGradient}
          >
            <Ionicons name="add" size={24} color={COLORS.text.dark} />
            <Text style={styles.registerButtonText}>Registrar mi Local</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* My Businesses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Locales</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.gold.primary} style={styles.loader} />
          ) : businesses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.text.muted} />
              <Text style={styles.emptyText}>No tienes locales registrados</Text>
              <Text style={styles.emptySubtext}>
                Registra tu local para generar tu código QR
              </Text>
            </View>
          ) : (
            businesses.map((business) => (
              <TouchableOpacity
                key={business.id}
                style={styles.businessCard}
                onPress={() => router.push(`/business/${business.id}`)}
              >
                <View style={styles.businessIcon}>
                  <Ionicons name="storefront" size={24} color={COLORS.gold.primary} />
                </View>
                <View style={styles.businessInfo}>
                  <Text style={styles.businessName}>{business.name}</Text>
                  <Text style={styles.businessType}>{business.type}</Text>
                  <Text style={styles.businessAddress}>{business.address}</Text>
                </View>
                <Ionicons name="qr-code" size={24} color={COLORS.gold.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beneficios</Text>
          
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
              <Ionicons name="people" size={20} color="#4CAF50" />
            </View>
            <View style={styles.benefitInfo}>
              <Text style={styles.benefitTitle}>Atrae más clientes</Text>
              <Text style={styles.benefitText}>Los usuarios de SEE ME verán tu local y podrán hacer check-in fácilmente</Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
              <Ionicons name="trending-up" size={20} color="#2196F3" />
            </View>
            <View style={styles.benefitInfo}>
              <Text style={styles.benefitTitle}>Visibilidad en la app</Text>
              <Text style={styles.benefitText}>Tu local aparecerá destacado como partner oficial de SEE ME</Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
              <Ionicons name="analytics" size={20} color="#FF9800" />
            </View>
            <View style={styles.benefitInfo}>
              <Text style={styles.benefitTitle}>Estadísticas</Text>
              <Text style={styles.benefitText}>Próximamente: visualiza cuántas personas hacen check-in en tu local</Text>
            </View>
          </View>
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
  infoBanner: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  infoBannerGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.gold,
    borderRadius: 20,
  },
  infoBannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  infoBannerText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  registerButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 32,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.text.secondary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  businessType: {
    fontSize: 13,
    color: COLORS.gold.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  businessAddress: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    lineHeight: 20,
  },
});
