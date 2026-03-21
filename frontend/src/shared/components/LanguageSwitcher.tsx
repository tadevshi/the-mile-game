import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  className?: string;
}

const languages = [
  { code: 'es', label: 'ES', flag: '🇦🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
];

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`
            px-2 py-1 rounded-full text-xs font-medium transition-all
            ${
              lang.code === currentLang.code
                ? 'bg-pink-100 text-pink-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }
          `}
          aria-label={`Switch to ${lang.label}`}
        >
          <span className="mr-0.5">{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
