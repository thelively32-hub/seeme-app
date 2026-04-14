import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import * as Localization from 'expo-localization';
import { translations, Language, TranslationKeys } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = '@seeme_language';

// Get device language
const getDeviceLanguage = (): Language => {
  try {
    let deviceLang = 'en';
    
    if (Platform.OS === 'web') {
      // For web, use browser language
      deviceLang = navigator.language || (navigator as any).userLanguage || 'en';
    } else {
      // For native, use expo-localization
      deviceLang = Localization.locale || 'en';
    }
    
    // Extract the base language code (e.g., 'es-MX' -> 'es')
    const baseLang = deviceLang.split('-')[0].toLowerCase();
    
    // Return the language if supported, otherwise default to English
    if (baseLang === 'es') return 'es';
    return 'en';
  } catch (e) {
    console.log('Error detecting device language:', e);
    return 'en';
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLang === 'en' || savedLang === 'es') {
        // Use saved preference
        setLanguageState(savedLang);
      } else {
        // First time - detect from device
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
        // Save the detected language
        await AsyncStorage.setItem(LANGUAGE_KEY, deviceLang);
      }
    } catch (e) {
      console.log('Error loading language:', e);
      // Fallback to device language detection
      setLanguageState(getDeviceLanguage());
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (e) {
      console.log('Error saving language:', e);
    }
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
