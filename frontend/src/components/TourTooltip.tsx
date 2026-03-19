import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTour, TOUR_STEPS } from '../context/TourContext';
import COLORS from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface TourTooltipProps {
  screen: string;
}

export default function TourTooltip({ screen }: TourTooltipProps) {
  const insets = useSafeAreaInsets();
  const {
    isTourActive,
    currentStep,
    currentTourStep,
    nextStep,
    previousStep,
    skipTour,
    isStepForScreen,
  } = useTour();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isVisible = isStepForScreen(screen);

  useEffect(() => {
    if (isVisible) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Animación de pulso para el spotlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [isVisible, currentStep]);

  if (!isVisible || !currentTourStep) {
    return null;
  }

  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const isCenterPosition = currentTourStep.position === 'center';

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <View style={styles.overlay}>
        {/* Fondo oscuro con transparencia */}
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]} 
        />

        {/* Contenedor del Tooltip */}
        <Animated.View
          style={[
            styles.tooltipContainer,
            isCenterPosition && styles.tooltipCenter,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={[COLORS.background.card, COLORS.background.secondary]}
            style={styles.tooltip}
          >
            {/* Indicador de progreso */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                {TOUR_STEPS.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= currentStep && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} / {totalSteps}
              </Text>
            </View>

            {/* Icono decorativo */}
            <Animated.View 
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <LinearGradient
                colors={[COLORS.gold.primary, COLORS.gold.secondary]}
                style={styles.iconGradient}
              >
                <Ionicons 
                  name={getIconForStep(currentTourStep.id)} 
                  size={28} 
                  color="#000" 
                />
              </LinearGradient>
            </Animated.View>

            {/* Título */}
            <Text style={styles.title}>{currentTourStep.title}</Text>

            {/* Descripción */}
            <Text style={styles.description}>{currentTourStep.description}</Text>

            {/* Botones */}
            <View style={styles.buttonsContainer}>
              {/* Botón Saltar */}
              {!isLastStep && (
                <TouchableOpacity style={styles.skipButton} onPress={skipTour}>
                  <Text style={styles.skipButtonText}>Saltar tour</Text>
                </TouchableOpacity>
              )}

              <View style={styles.navButtons}>
                {/* Botón Anterior */}
                {!isFirstStep && (
                  <TouchableOpacity style={styles.prevButton} onPress={previousStep}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.text.secondary} />
                  </TouchableOpacity>
                )}

                {/* Botón Siguiente / Comenzar */}
                <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                  <LinearGradient
                    colors={[COLORS.gold.primary, COLORS.gold.secondary]}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={styles.nextButtonText}>
                      {isLastStep ? '¡Comenzar!' : 'Siguiente'}
                    </Text>
                    {!isLastStep && (
                      <Ionicons name="chevron-forward" size={18} color="#000" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Flecha apuntando al elemento (si no es center) */}
        {!isCenterPosition && (
          <Animated.View
            style={[
              styles.arrow,
              getArrowStyle(currentTourStep.position),
              { opacity: fadeAnim },
            ]}
          >
            <View style={[styles.arrowInner, getArrowInnerStyle(currentTourStep.position)]} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// Obtener icono según el paso
function getIconForStep(stepId: string): string {
  const icons: Record<string, string> = {
    explore_welcome: 'sparkles',
    explore_places: 'location',
    explore_checkin: 'checkmark-circle',
    vibes_intro: 'heart',
    vibes_send: 'send',
    invitations_intro: 'megaphone',
    invitations_create: 'add-circle',
    profile_intro: 'person',
    profile_settings: 'settings',
    tour_complete: 'rocket',
  };
  return icons[stepId] || 'information-circle';
}

// Estilos de la flecha según posición
function getArrowStyle(position: string) {
  switch (position) {
    case 'top':
      return { bottom: '45%', alignSelf: 'center' as const };
    case 'bottom':
      return { top: '25%', alignSelf: 'center' as const };
    case 'left':
      return { right: '20%', top: '40%' };
    case 'right':
      return { left: '20%', top: '40%' };
    default:
      return {};
  }
}

function getArrowInnerStyle(position: string) {
  switch (position) {
    case 'top':
      return styles.arrowDown;
    case 'bottom':
      return styles.arrowUp;
    case 'left':
      return styles.arrowRight;
    case 'right':
      return styles.arrowLeft;
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  tooltipContainer: {
    width: width - 48,
    maxWidth: 360,
    zIndex: 10,
  },
  tooltipCenter: {
    // Ya está centrado por el contenedor padre
  },
  tooltip: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.background.tertiary,
  },
  progressDotActive: {
    backgroundColor: COLORS.gold.primary,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.muted,
    fontWeight: '500',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prevButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  arrow: {
    position: 'absolute',
    zIndex: 5,
  },
  arrowInner: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  arrowUp: {
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.gold.primary,
  },
  arrowDown: {
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.gold.primary,
  },
  arrowLeft: {
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: COLORS.gold.primary,
  },
  arrowRight: {
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.gold.primary,
  },
});
