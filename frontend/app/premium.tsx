import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import COLORS from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import revenueCatService, { PRODUCT_IDS } from '../src/services/revenueCat';
import { useAuth } from '../src/context/AuthContext';

const { width } = Dimensions.get('window');

const PREMIUM_BENEFITS = [
  { icon: 'infinite-outline', text: 'Vibes ilimitados', description: 'Send unlimited vibes to anyone' },
  { icon: 'eye-off-outline', text: 'Modo Fantasma', description: 'Browse invisibly' },
  { icon: 'person-circle-outline', text: 'Ver quién te vio', description: 'See who viewed your profile' },
  { icon: 'flash-outline', text: 'Invitaciones prioritarias', description: 'Get seen first' },
  { icon: 'options-outline', text: 'Filtros avanzados', description: 'Find exactly who you want' },
  { icon: 'diamond-outline', text: 'Descubrimiento VIP', description: 'Access exclusive places' },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'daily' | 'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const getProductId = () => {
    if (selectedPlan === 'daily') return PRODUCT_IDS.DAILY;
    if (selectedPlan === 'monthly') return PRODUCT_IDS.MONTHLY;
    return PRODUCT_IDS.YEARLY;
  };

  const handleUpgrade = async () => {
    try {
      setPurchasing(true);
      const offerings = await revenueCatService.getOfferings();
      if (!offerings) {
        Alert.alert('Error', 'Could not load plans. Please try again.');
        return;
      }
      const productId = getProductId();
      const pkg = offerings?.current?.availablePackages?.find(
        (p: any) => p.product?.productIdentifier === productId
      );
      if (!pkg) {
        Alert.alert('Error', 'Plan not available. Please try again later.');
        return;
      }
      const result = await revenueCatService.purchasePackage(pkg);
      if (result.success) {
        await refreshUser?.();
        Alert.alert('🎉 Welcome to Vibe Me Pro!', 'Your subscription is now active.', [
          { text: 'Let\'s go!', onPress: () => router.back() }
        ]);
      }
    } catch (e: any) {
      if (!e.message?.includes('cancelled')) {
        Alert.alert('Error', e.message || 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.gradients.darkBackground}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <Animated.View style={[styles.heroContainer, { opacity: 1 }]}>
          {/* Glow Effect */}
          <Animated.View style={[styles.heroGlow, { opacity: glowOpacity }]} />
          
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.02)']}
            style={styles.heroCard}
          >
            {/* Crown Icon */}
            <View style={styles.crownContainer}>
              <LinearGradient
                colors={COLORS.gradients.goldButton}
                style={styles.crownIcon}
              >
                <Ionicons name="diamond" size={32} color={COLORS.background.primary} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>VIBE ME</Text>
            <Text style={styles.heroSubtitle}>PRO</Text>

            {/* Badge */}
            <View style={styles.badgeContainer}>
              <LinearGradient
                colors={COLORS.gradients.premiumButton}
                style={styles.badge}
              >
                <Text style={styles.badgeText}>SAVE 40%</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Plan Selector */}
        <View style={styles.planSelector}>
          {/* Daily */}
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'daily' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('daily')}
          >
            <Text style={[styles.planPrice, selectedPlan === 'daily' && styles.planPriceActive]}>
              $0.99
            </Text>
            <Text style={[styles.planPeriod, selectedPlan === 'daily' && styles.planPeriodActive]}>
              /day
            </Text>
            <Text style={styles.planTrial}>Try it</Text>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>
              $9.99
            </Text>
            <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.planPeriodActive]}>
              /month
            </Text>
          </TouchableOpacity>

          {/* Yearly */}
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'yearly' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <Text style={[styles.planPrice, selectedPlan === 'yearly' && styles.planPriceActive]}>
              $59.99
            </Text>
            <Text style={[styles.planPeriod, selectedPlan === 'yearly' && styles.planPeriodActive]}>
              /year
            </Text>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>What you get</Text>
          
          {PREMIUM_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as any} size={22} color={COLORS.gold.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.text}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.gold.primary} />
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={[styles.ctaButton, purchasing && { opacity: 0.7 }]} 
          activeOpacity={0.9}
          onPress={handleUpgrade}
          disabled={purchasing}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {purchasing ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="diamond" size={20} color={COLORS.background.primary} />
                <Text style={styles.ctaText}>
                  {selectedPlan === 'daily' ? 'Try for $0.99' : 
                   selectedPlan === 'monthly' ? 'Start Monthly — $9.99' : 
                   'Start Yearly — $59.99'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          {selectedPlan === 'daily' 
            ? '24 hours of full access. No automatic renewal.'
            : 'Cancel anytime. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.'}
        </Text>

        {/* Restore Purchases */}
        <TouchableOpacity 
          style={styles.restoreButton}
          onPress={async () => {
            try {
              const result = await revenueCatService.restorePurchases();
              if (result.success && result.isPremium) {
                await refreshUser?.();
                Alert.alert('✅ Restored!', 'Your subscription has been restored.');
              } else {
                Alert.alert('No purchases', 'No previous purchases found.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not restore purchases.');
            }
          }}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero
  heroContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.gold.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 60,
      },
    }),
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  crownContainer: {
    marginBottom: 16,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
    }),
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '200',
    color: COLORS.text.primary,
    letterSpacing: 8,
  },
  heroSubtitle: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.gold.primary,
    letterSpacing: 12,
    marginTop: -4,
  },
  badgeContainer: {
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },

  // Plan Selector
  planSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  planOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: COLORS.glass.background,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  planOptionActive: {
    backgroundColor: `${COLORS.gold.primary}15`,
    borderColor: COLORS.gold.primary,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  planPriceActive: {
    color: COLORS.gold.primary,
  },
  planPeriod: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  planPeriodActive: {
    color: COLORS.text.secondary,
  },
  planTrial: {
    fontSize: 10,
    color: COLORS.gold.primary,
    fontWeight: '600',
    marginTop: 2,
  },
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.premium.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Benefits
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.gold.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  benefitDescription: {
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 2,
  },

  // CTA
  ctaButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
    }),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.background.primary,
    letterSpacing: 0.5,
  },

  // Terms
  terms: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
});
