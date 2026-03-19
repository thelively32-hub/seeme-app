import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_STORAGE_KEY = '@seeme_tour_completed';

export interface TourStep {
  id: string;
  screen: string;
  target: string; // ID del elemento a destacar
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// Definición de todos los pasos del tour
export const TOUR_STEPS: TourStep[] = [
  // Pantalla Explore
  {
    id: 'explore_welcome',
    screen: 'explore',
    target: 'explore_header',
    title: '¡Bienvenido a SEE ME! 👋',
    description: 'Descubre personas cerca de ti en tiempo real. Aquí verás los lugares más populares de tu zona.',
    position: 'bottom',
  },
  {
    id: 'explore_places',
    screen: 'explore',
    target: 'explore_places',
    title: 'Lugares Cercanos 📍',
    description: 'Estos son los lugares cerca de ti. El punto dorado 🟡 indica que hay personas activas ahí.',
    position: 'top',
  },
  {
    id: 'explore_checkin',
    screen: 'explore',
    target: 'explore_checkin',
    title: 'Haz Check-in ✨',
    description: 'Toca un lugar para hacer check-in y que otros te vean. ¡Así empiezas a conectar!',
    position: 'top',
  },
  // Pantalla Vibes
  {
    id: 'vibes_intro',
    screen: 'vibes',
    target: 'vibes_header',
    title: 'Tus Vibes 💫',
    description: 'Aquí verás los Vibes que envías y recibes. Los Vibes son la forma única de SEE ME para conectar.',
    position: 'bottom',
  },
  {
    id: 'vibes_send',
    screen: 'vibes',
    target: 'vibes_send',
    title: 'Envía un Vibe ❤️',
    description: 'En vez de mensajes aburridos, envía un Vibe que exprese tu intención: amistad, cita, un trago...',
    position: 'top',
  },
  // Pantalla Invitaciones
  {
    id: 'invitations_intro',
    screen: 'invitations',
    target: 'invitations_header',
    title: 'Invitaciones 📣',
    description: '¿Quién para el cine? ¿Quién para un café? Publica tu plan y encuentra compañía.',
    position: 'bottom',
  },
  {
    id: 'invitations_create',
    screen: 'invitations',
    target: 'invitations_fab',
    title: 'Crea una Invitación ➕',
    description: 'Toca aquí para publicar un plan. Elige si invitas tú (Full) o dividen (50/50).',
    position: 'top',
  },
  // Pantalla Profile
  {
    id: 'profile_intro',
    screen: 'profile',
    target: 'profile_header',
    title: 'Tu Perfil 👤',
    description: 'Aquí puedes ver tus estadísticas, editar tu perfil y acceder a configuración.',
    position: 'bottom',
  },
  {
    id: 'profile_settings',
    screen: 'profile',
    target: 'profile_settings',
    title: 'Configuración ⚙️',
    description: 'Accede a seguridad, modo fantasma, y más opciones desde aquí.',
    position: 'left',
  },
  // Final
  {
    id: 'tour_complete',
    screen: 'explore',
    target: 'tour_complete',
    title: '¡Listo para comenzar! 🎉',
    description: 'Ya conoces lo básico. ¡Ahora ve a explorar y conecta con personas increíbles!',
    position: 'center',
  },
];

interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  currentTourStep: TourStep | null;
  hasCompletedTour: boolean;
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
  isStepForScreen: (screen: string) => boolean;
  getStepsForScreen: (screen: string) => TourStep[];
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default true to prevent flash

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
      const isCompleted = completed === 'true';
      setHasCompletedTour(isCompleted);
      
      // Si no ha completado el tour, iniciarlo automáticamente
      if (!isCompleted) {
        setTimeout(() => {
          setIsTourActive(true);
        }, 1500); // Esperar a que cargue la app
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsTourActive(true);
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = async () => {
    setIsTourActive(false);
    setHasCompletedTour(true);
    try {
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Error saving tour status:', error);
    }
  };

  const completeTour = async () => {
    setIsTourActive(false);
    setHasCompletedTour(true);
    try {
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Error saving tour status:', error);
    }
  };

  const resetTour = async () => {
    try {
      await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
      setHasCompletedTour(false);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  };

  const currentTourStep = isTourActive ? TOUR_STEPS[currentStep] : null;

  const isStepForScreen = (screen: string) => {
    return isTourActive && currentTourStep?.screen === screen;
  };

  const getStepsForScreen = (screen: string) => {
    return TOUR_STEPS.filter(step => step.screen === screen);
  };

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        currentTourStep,
        hasCompletedTour,
        startTour,
        nextStep,
        previousStep,
        skipTour,
        completeTour,
        resetTour,
        isStepForScreen,
        getStepsForScreen,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export default TourContext;
