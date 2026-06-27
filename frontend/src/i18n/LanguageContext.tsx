import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { translations, Language, TranslationKeys } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = '@seeme_language';
const SUPPORTED: Language[] = ['en', 'es'];

// Detect device language without expo-localization
// Uses Intl API (Hermes built-in) or native locale string
const getDeviceLanguage = (): Language => {
  try {
    let baseLang = 'en';

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined') {
        baseLang = (navigator.language || 'en').split('-')[0].toLowerCase();
      }
    } else {
      // iOS: NativeModules.SettingsManager or Intl
      // Android: NativeModules.I18nManager
      // Both: Intl.DateTimeFormat works in Hermes
      if (typeof Intl !== 'undefined') {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        baseLang = locale.split('-')[0].toLowerCase();
      } else if (Platform.OS === 'ios') {
        const locale = NativeModules.SettingsManager?.settings?.AppleLocale
          || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
          || 'en';
        baseLang = locale.split('_')[0].split('-')[0].toLowerCase();
      } else {
        const locale = NativeModules.I18nManager?.localeIdentifier || 'en';
        baseLang = locale.split('_')[0].toLowerCase();
      }
    }

    return SUPPORTED.includes(baseLang as Language) ? (baseLang as Language) : 'en';
  } catch {
    return 'en';
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

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
        // First time - detect from device/browser
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
        // Save the detected language
        await AsyncStorage.setItem(LANGUAGE_KEY, deviceLang);
      }
    } catch (e) {
      console.log('Error loading language:', e);
      // Fallback to device language detection
      setLanguageState(getDeviceLanguage());
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
