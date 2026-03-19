import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  id: 'basic' | 'premium';
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 'Gratis',
    period: '',
    description: 'Perfecto para empezar a conectar',
    features: [
      { text: 'Ver lugares cercanos', included: true },
      { text: 'Hacer check-in', included: true },
      { text: 'Enviar 5 Vibes por día', included: true },
      { text: 'Chat temporal 24h', included: true },
      { text: 'Crear invitaciones públicas', included: true },
      { text: 'Responder a invitaciones', included: true },
      { text: 'Ver perfil del que invita (solo si te acepta)', included: true },
      { text: 'Vibes ilimitados', included: false },
      { text: 'Modo Fantasma', included: false },
      { text: 'Ver perfil ANTES de responder', included: false },
      { text: 'Buscar y ver cualquier perfil', included: false },
      { text: 'Enviar invitaciones directas', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: '/mes',
    description: 'Desbloquea todo el potencial de SEE ME',
    popular: true,
    features: [
      { text: 'Todo lo del plan Básico', included: true },
      { text: 'Vibes ILIMITADOS', included: true, highlight: true },
      { text: 'Modo Fantasma (invisible)', included: true, highlight: true },
      { text: 'Ver perfil ANTES de responder', included: true, highlight: true },
      { text: 'Ver reviews, ratings y lugares visitados', included: true, highlight: true },
      { text: 'Buscar y ver CUALQUIER perfil', included: true, highlight: true },
      { text: 'Enviar invitaciones a personas específicas', included: true, highlight: true },
      { text: 'Badge Premium dorado ✨', included: true },
      { text: 'Prioridad en el feed', included: true },
      { text: 'Sin anuncios', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
];

const FeatureRow = ({ feature, isPremium }: { feature: PlanFeature; isPremium: boolean }) => (
  <View style={styles.featureRow}>
    <View style={[
      styles.featureIcon,
      feature.included ? styles.featureIconIncluded : styles.featureIconExcluded,
      feature.highlight && styles.featureIconHighlight,
    ]}>
      <Ionicons 
        name={feature.included ? 'checkmark' : 'close'} 
        size={14} 
        color={feature.included ? (feature.highlight ? '#000' : COLORS.gold.primary) : COLORS.text.muted} 
      />
    </View>
    <Text style={[
      styles.featureText,
      !feature.included && styles.featureTextExcluded,
      feature.highlight && styles.featureTextHighlight,
    ]}>
      {feature.text}
    </Text>
  </View>
);

const PlanCard = ({ 
  plan, 
  isSelected, 
  onSelect 
}: { 
  plan: Plan; 
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const isPremium = plan.id === 'premium';
  
  return (
    <Animated.View 
      entering={FadeInUp.delay(isPremium ? 200 : 100).springify()}
      style={[styles.planCard, isSelected && styles.planCardSelected]}
    >
      {plan.popular && (
        <LinearGradient
          colors={[COLORS.gold.primary, COLORS.gold.secondary]}
          style={styles.popularBadge}
        >
          <Ionicons name="star" size={12} color="#000" />
          <Text style={styles.popularText}>MÁS POPULAR</Text>
        </LinearGradient>
      )}

      <TouchableOpacity 
        style={styles.planContent}
        onPress={onSelect}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View style={styles.planHeader}>
          <Text style={[styles.planName, isPremium && styles.planNamePremium]}>
            {plan.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.planPrice, isPremium && styles.planPricePremium]}>
              {plan.price}
            </Text>
            {plan.period && (
              <Text style={styles.planPeriod}>{plan.period}</Text>
            )}
          </View>
          <Text style={styles.planDescription}>{plan.description}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Features */}
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <FeatureRow 
              key={index} 
              feature={feature} 
              isPremium={isPremium}
            />
          ))}
        </View>

        {/* Select Button */}
        {isPremium ? (
          <LinearGradient
            colors={[COLORS.gold.primary, COLORS.gold.secondary, '#B8860B']}
            style={styles.selectButton}
          >
            <Text style={styles.selectButtonTextPremium}>
              {isSelected ? '✓ Seleccionado' : 'Elegir Premium'}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.selectButton, styles.selectButtonBasic]}>
            <Text style={styles.selectButtonTextBasic}>
              {isSelected ? '✓ Plan Actual' : 'Continuar Gratis'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = () => {
    if (selectedPlan === 'premium') {
      Alert.alert(
        'Próximamente',
        'El sistema de pagos estará disponible pronto. ¡Gracias por tu interés en Premium!',
        [{ text: 'OK' }]
      );
    } else {
      router.back();
    }
  };

  const yearlyPrice = billingCycle === 'yearly' ? '$59.99' : '$9.99';
  const yearlySavings = billingCycle === 'yearly' ? 'Ahorras $60/año' : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, '#1a0a2e', COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.titleSection}>
          <LinearGradient
            colors={[COLORS.gold.primary, COLORS.gold.secondary]}
            style={styles.crownIcon}
          >
            <Ionicons name="diamond" size={32} color="#000" />
          </LinearGradient>
          <Text style={styles.title}>Elige tu Plan</Text>
          <Text style={styles.subtitle}>
            Desbloquea funciones exclusivas y conecta sin límites
          </Text>
        </Animated.View>

        {/* Billing Toggle */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
              Mensual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingText, billingCycle === 'yearly' && styles.billingTextActive]}>
              Anual
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>-50%</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                ...plan,
                price: plan.id === 'premium' ? (billingCycle === 'yearly' ? '$4.99' : '$9.99') : plan.price,
                period: plan.id === 'premium' ? (billingCycle === 'yearly' ? '/mes (facturado anual)' : '/mes') : '',
              }}
              isSelected={selectedPlan === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
            />
          ))}
        </View>

        {/* Yearly Savings Info */}
        {billingCycle === 'yearly' && selectedPlan === 'premium' && (
          <Animated.View entering={FadeInUp.springify()} style={styles.savingsInfo}>
            <Ionicons name="gift" size={20} color={COLORS.gold.primary} />
            <Text style={styles.savingsInfoText}>
              ¡Ahorras <Text style={styles.savingsAmount}>$60</Text> al año con el plan anual!
            </Text>
          </Animated.View>
        )}

        {/* Guarantee */}
        <View style={styles.guarantee}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.gold.primary} />
          <Text style={styles.guaranteeText}>
            Garantía de devolución de 7 días • Cancela cuando quieras
          </Text>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          Al suscribirte, aceptas nuestros{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
            Términos de Servicio
          </Text>
          {' '}y{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
            Política de Privacidad
          </Text>
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={handleSubscribe}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={
              selectedPlan === 'premium' 
                ? [COLORS.gold.primary, COLORS.gold.secondary, '#B8860B']
                : [COLORS.background.card, COLORS.background.tertiary]
            }
            style={styles.ctaGradient}
          >
            <Text style={[
              styles.ctaText,
              selectedPlan === 'premium' && styles.ctaTextPremium
            ]}>
              {selectedPlan === 'premium' 
                ? `Comenzar Premium - ${billingCycle === 'yearly' ? '$59.99/año' : '$9.99/mes'}`
                : 'Continuar con Plan Básico'
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: COLORS.background.tertiary,
  },
  billingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
  billingTextActive: {
    color: COLORS.text.primary,
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: COLORS.gold.primary,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  planContent: {
    padding: 20,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  planNamePremium: {
    color: COLORS.gold.primary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  planPricePremium: {
    color: COLORS.gold.primary,
  },
  planPeriod: {
    fontSize: 16,
    color: COLORS.text.muted,
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.text.muted,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 16,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconIncluded: {
    backgroundColor: `${COLORS.gold.primary}20`,
  },
  featureIconExcluded: {
    backgroundColor: COLORS.background.tertiary,
  },
  featureIconHighlight: {
    backgroundColor: COLORS.gold.primary,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  featureTextExcluded: {
    color: COLORS.text.muted,
    textDecorationLine: 'line-through',
  },
  featureTextHighlight: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  selectButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectButtonBasic: {
    backgroundColor: COLORS.background.tertiary,
  },
  selectButtonTextPremium: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  selectButtonTextBasic: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  savingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.gold.primary}15`,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  savingsInfoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  savingsAmount: {
    color: COLORS.gold.primary,
    fontWeight: '700',
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  terms: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.gold.primary,
    textDecorationLine: 'underline',
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  ctaTextPremium: {
    color: '#000',
    fontWeight: '700',
  },
});
