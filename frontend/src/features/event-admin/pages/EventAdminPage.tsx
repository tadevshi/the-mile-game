import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, MessageSquare, Palette, BarChart3, TrendingUp, Eye, Camera } from 'lucide-react';
import { useEventAdmin, type AdminTab } from '../hooks/useEventAdmin';
import { ConfigTab } from '../components/ConfigTab';
import { QuestionsTab } from '../components/QuestionsTab';
import { ThemeTab } from '../components/ThemeTab';
import { CorkboardTab } from '../components/CorkboardTab';
import { StatsTab } from '../components/StatsTab';

import { AnalyticsDashboard } from '@/features/analytics/pages/AnalyticsDashboard';
import { Skeleton } from '@/shared/components/Skeleton';
import { api } from '@/shared/lib/api';
import { getPresetByName, createTheme, applyCSSVariables } from '@/shared/theme';
import type { PreviewTheme } from '@/themes';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> },
  { id: 'questions', label: 'Preguntas', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'theme', label: 'Tema', icon: <Palette className="w-4 h-4" /> },
  { id: 'corkboard', label: 'Corkboard', icon: <Camera className="w-4 h-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
];

// Admin preview theme state - allows immediate preview of theme changes
const defaultAdminTheme: PreviewTheme = {
  primaryColor: '#EC4899',
  secondaryColor: '#FBCFE8',
  accentColor: '#DB2777',
  bgColor: '#FFF5F7',
  textColor: '#1E293B',
  displayFont: 'Great Vibes',
  headingFont: 'Playfair Display',
  bodyFont: 'Montserrat',
  backgroundStyle: 'watercolor',
};

export function EventAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const tabParam = searchParams.get('tab') as AdminTab | null;
  
  // Preview theme state - allows immediate theme preview without saving
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>(defaultAdminTheme);
  const [showPreviewBadge, setShowPreviewBadge] = useState(false);
  const themeCleanupRef = useRef<(() => void) | null>(null);

  const currentTab: AdminTab = TABS.find((t) => t.id === tabParam)?.id ?? 'config';
  const isDarkPreview = previewTheme.backgroundStyle === 'dark';
  const chromeSurface = isDarkPreview ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.8)';
  const chromeBorder = isDarkPreview ? 'rgba(148, 163, 184, 0.18)' : `${previewTheme.secondaryColor}50`;
  const panelSurface = isDarkPreview ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.8)';
  const panelBorder = isDarkPreview ? 'rgba(148, 163, 184, 0.14)' : 'rgba(255, 255, 255, 0.5)';
  const tabRailSurface = isDarkPreview ? 'rgba(30, 41, 59, 0.76)' : `${previewTheme.secondaryColor}30`;
  const activeTabSurface = isDarkPreview ? 'rgba(15, 23, 42, 0.96)' : '#FFFFFF';
  const mutedText = isDarkPreview ? 'rgba(226, 232, 240, 0.78)' : `${previewTheme.textColor}80`;

  const { event, isLoadingEvent, errorEvent, refetchEvent } = useEventAdmin(slug);

  // Tabs configurables - Secret Box ahora es parte de ConfigTab, no una tab separada
  const visibleTabs = TABS;

  // Apply theme to CSS variables for preview
  const applyThemeToCSS = useCallback((theme: PreviewTheme) => {
    themeCleanupRef.current?.();
    const completeTheme = createTheme({
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      bgColor: theme.bgColor,
      textColor: theme.textColor,
      displayFont: theme.displayFont,
      headingFont: theme.headingFont,
      bodyFont: theme.bodyFont,
      backgroundStyle: theme.backgroundStyle,
    });
    themeCleanupRef.current = applyCSSVariables(completeTheme);
  }, []);

  // Initialize preview theme from event data when it loads
  useEffect(() => {
    // Theme is stored in settings.theme (backend stores preset name there when applied)
    const themeIdFromSettings = event?.settings?.theme;
    if (themeIdFromSettings) {
      const preset = getPresetByName(themeIdFromSettings);
      if (preset) {
        const themeFromPreset: PreviewTheme = {
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
          accentColor: preset.accentColor,
          bgColor: preset.bgColor,
          textColor: preset.textColor,
          displayFont: preset.displayFont,
          headingFont: preset.headingFont,
          bodyFont: preset.bodyFont,
          backgroundStyle: preset.backgroundStyle,
        };
        setPreviewTheme(themeFromPreset);
        applyThemeToCSS(themeFromPreset);
      }
    }
  }, [event?.settings?.theme, applyThemeToCSS]);

  // Cleanup CSS variables when leaving admin page
  useEffect(() => {
    return () => {
      themeCleanupRef.current?.();
      themeCleanupRef.current = null;
    };
  }, []);

  const handleTabChange = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  const handleBack = () => {
    themeCleanupRef.current?.();
    themeCleanupRef.current = null;
    navigate('/dashboard');
  };

  // Callback to update preview theme from child components (ThemeTab)
  const handleThemePreview = useCallback((theme: PreviewTheme) => {
    setPreviewTheme(theme);
    applyThemeToCSS(theme);
    setShowPreviewBadge(true);
    setTimeout(() => setShowPreviewBadge(false), 3000);
  }, [applyThemeToCSS]);

  // Callback to save the theme permanently
  const handleThemeSave = useCallback(async (themeName: string) => {
    try {
      await api.post(`/admin/events/${slug}/theme/preset`, { preset: themeName });
      await refetchEvent();
      setShowPreviewBadge(false);
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  }, [slug, refetchEvent]);

  if (errorEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: previewTheme.bgColor }}>
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar el evento</p>
          <p className="text-gray-500 text-sm">{String(errorEvent)}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: previewTheme.primaryColor }}
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: previewTheme.bgColor }}>
      {/* Preview Badge */}
      {showPreviewBadge && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          style={{ 
            backgroundColor: previewTheme.primaryColor, 
            color: '#FFFFFF' 
          }}
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Vista previa activa</span>
        </motion.div>
      )}

        <header 
          className="backdrop-blur-sm border-b sticky top-0 z-10"
          style={{ 
            backgroundColor: chromeSurface,
            borderColor: chromeBorder
          }}
        >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg transition-colors"
              style={{ color: previewTheme.textColor }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
              <div className="flex-1 min-w-0">
                {isLoadingEvent ? (
                  <>
                    <Skeleton height="20px" width="160px" className="mb-1" />
                    <Skeleton height="12px" width="100px" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h1 
                        className="font-display text-xl truncate"
                        style={{ color: previewTheme.textColor }}
                      >
                        {event?.name || slug}
                      </h1>
                      {/* Active Theme Badge */}
                      {event?.settings?.theme && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${previewTheme.primaryColor}20`,
                            color: previewTheme.primaryColor 
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: previewTheme.primaryColor }}
                          />
                          {event.settings.theme}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: mutedText }}>
                      Panel de administración
                    </p>
                  </>
                )}
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-sm rounded-3xl shadow-xl border p-6"
          style={{ 
            backgroundColor: panelSurface,
            borderColor: panelBorder
          }}
        >
          <nav 
            className="flex gap-1 mb-6 p-1 rounded-xl"
            style={{ backgroundColor: tabRailSurface }}
          >
            {visibleTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive ? 'shadow-sm' : ''}
                  `}
                  style={{ 
                    backgroundColor: isActive ? activeTabSurface : 'transparent',
                    color: isActive ? previewTheme.primaryColor : mutedText
                  }}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
          {currentTab === 'config' && (
            <ConfigTab 
              slug={slug} 
              currentTab={currentTab}
              previewTheme={previewTheme}
            />
          )}
          {currentTab === 'questions' && (
            <QuestionsTab 
              slug={slug} 
              previewTheme={previewTheme}
            />
          )}
          {currentTab === 'theme' && (
            <ThemeTab 
              slug={slug} 
              onPreview={handleThemePreview}
              onSave={handleThemeSave}
              previewTheme={previewTheme}
            />
          )}
          {currentTab === 'corkboard' && (
            <CorkboardTab 
              slug={slug} 
              previewTheme={previewTheme}
            />
          )}
          {currentTab === 'stats' && (
            <StatsTab 
              slug={slug} 
              previewTheme={previewTheme}
            />
          )}
          {currentTab === 'analytics' && <AnalyticsDashboard eventSlug={slug} />}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
