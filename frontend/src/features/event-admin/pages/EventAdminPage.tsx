import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, MessageSquare, Palette, BarChart3 } from 'lucide-react';
import { useEventAdmin, type AdminTab } from '../hooks/useEventAdmin';
import { ConfigTab } from '../components/ConfigTab';
import { QuestionsTab } from '../components/QuestionsTab';
import { ThemeTab } from '../components/ThemeTab';
import { StatsTab } from '../components/StatsTab';
import { Skeleton } from '@/shared/components/Skeleton';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> },
  { id: 'questions', label: 'Preguntas', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'theme', label: 'Tema', icon: <Palette className="w-4 h-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
];

export function EventAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const tabParam = searchParams.get('tab') as AdminTab | null;

  const currentTab: AdminTab = TABS.find((t) => t.id === tabParam)?.id ?? 'config';

  const { event, isLoadingEvent, errorEvent } = useEventAdmin(slug);

  const handleTabChange = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (errorEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error al cargar el evento</p>
          <p className="text-gray-500 text-sm">{String(errorEvent)}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-pink-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              {isLoadingEvent ? (
                <>
                  <Skeleton height="20px" width="160px" className="mb-1" />
                  <Skeleton height="12px" width="100px" />
                </>
              ) : (
                <>
                  <h1 className="font-display text-xl text-gray-800 truncate">
                    {event?.name || slug}
                  </h1>
                  <p className="text-xs text-gray-500">Panel de administración</p>
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
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6"
        >
          <nav className="flex gap-1 mb-6 bg-pink-50/50 p-1 rounded-xl">
            {TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-white text-pink-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
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
          {currentTab === 'config' && <ConfigTab slug={slug} currentTab={currentTab} />}
          {currentTab === 'questions' && <QuestionsTab slug={slug} />}
          {currentTab === 'theme' && <ThemeTab slug={slug} />}
          {currentTab === 'stats' && <StatsTab slug={slug} />}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
