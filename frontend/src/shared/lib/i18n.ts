import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esTranslations from '../../../public/locales/es/translation.json';
import enTranslations from '../../../public/locales/en/translation.json';

const resources = {
  es: { translation: esTranslations },
  en: { translation: enTranslations },
};

// Get browser language, fallback to Spanish
const getBrowserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'es';
  
  const browserLang = navigator.language.split('-')[0];
  return ['es', 'en'].includes(browserLang) ? browserLang : 'es';
};

// Get saved language preference from localStorage
const getSavedLanguage = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem('eventhub-language');
  } catch {
    return null;
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage() || getBrowserLanguage(),
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    
    // Disable interpolation since we're loading translations separately
    interpolation: {
      escapeValue: false,
    },
    
    // Lazy load translations
    react: {
      useSuspense: false,
    },
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('eventhub-language', lng);
  } catch {
    // localStorage unavailable
  }
});

export default i18n;
