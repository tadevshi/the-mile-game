import { useState, useEffect } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card, MedalCanvas, RankingSkeleton, useFeatureEnabled, CelebrationAnimation } from '@/shared';
import { useRanking } from '../hooks/useRanking';
import { useTheme } from '@/shared/theme/useTheme';

const medalBgColors: Record<string, string> = {
  gold: 'bg-gold',
  silver: 'bg-silver',
  bronze: 'bg-bronze',
};

const podiumHeights: Record<number, string> = {
  1: 'h-28',
  2: 'h-20',
  3: 'h-16',
};

// Variantes de animación
const podiumVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: (position: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
      delay: position === 1 ? 0.3 : position === 2 ? 0.2 : 0.4,
    },
  }),
};

export function RankingPage() {
  const navigate = useEventNavigate();
  // Default to true for backward compatibility in legacy routes (no event loaded)
  const isCorkboardEnabled = useFeatureEnabled('corkboard') ?? true;
  const {
    ranking,
    isLoading,
    error,
    currentPlayerId,
    isWsConnected,
    top3,
    podiumOrder,
    restOfPlayers,
  } = useRanking();

  // Theme colors for dynamic styling
  const theme = useTheme();

  // Celebration for top 3 players
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationRank, setCelebrationRank] = useState<1 | 2 | 3>(1);
  const [celebrationName, setCelebrationName] = useState('');
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Check if current player is in top 3 and show celebration
  // Only show once per ranking load to prevent infinite loop
  useEffect(() => {
    if (currentPlayerId && top3.length > 0 && !showCelebration && !hasCelebrated) {
      const currentPlayer = top3.find(p => p.id === currentPlayerId);
      if (currentPlayer && currentPlayer.position <= 3) {
        // Delay celebration to let the page load
        const timer = setTimeout(() => {
          setCelebrationRank(currentPlayer.position as 1 | 2 | 3);
          setCelebrationName(currentPlayer.name);
          setShowCelebration(true);
          setHasCelebrated(true); // Mark as celebrated to prevent re-trigger
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPlayerId, top3, showCelebration, hasCelebrated]);

  // Reset flag when player changes (allows celebration again)
  useEffect(() => {
    if (currentPlayerId) {
      setHasCelebrated(false);
    }
  }, [currentPlayerId]);

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <PageLayout background="theme" showSparkles={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1"
        >
          <RankingSkeleton />
        </motion.div>
      </PageLayout>
    );
  }

  // Si hay error
  if (error) {
    return (
      <PageLayout background="theme" showSparkles={false}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 
              className="text-3xl mb-4"
              style={{ 
                fontFamily: theme.currentTheme.headingFont,
                color: theme.currentTheme.primaryColor 
              }}
            >
              Error
            </h1>
            <p 
              className="mb-6"
              style={{ 
                fontFamily: theme.currentTheme.bodyFont,
                color: theme.currentTheme.textColor 
              }}
            >
              {error}
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Si no hay jugadores, mostrar mensaje
  if (ranking.length === 0) {
    return (
      <PageLayout background="theme" showSparkles={false}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6">
            <div className="text-6xl mb-4">🎮</div>
            <h1 
              className="text-3xl mb-4"
              style={{ 
                fontFamily: theme.currentTheme.headingFont,
                color: theme.currentTheme.primaryColor 
              }}
            >
              Aún no hay jugadores
            </h1>
            <p 
              className="mb-6"
              style={{ 
                fontFamily: theme.currentTheme.bodyFont,
                color: theme.currentTheme.textColor 
              }}
            >
              ¡Sé el primero en jugar y aparecer en el ranking!
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/')}
            >
              Empezar a Jugar
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout background="theme" showSparkles={false}>
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Celebration Animation for Top 3 */}
        <CelebrationAnimation
          rank={celebrationRank}
          playerName={celebrationName}
          isVisible={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
        <div className="max-w-md mx-auto w-full flex flex-col flex-1 space-y-6">
          {/* Header con indicador de conexión */}
          <div className="text-center relative">
            <Header
              title="Ranking"
              subtitle="¡Felicidades!"
              size="md"
              decoration="lines"
            />
            {/* Indicador de conexión WebSocket */}
            <div className="absolute top-0 right-0 flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm border border-slate-200 dark:border-slate-700">
              <motion.span
                className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`}
                animate={isWsConnected ? {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                } : {}}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span className={`text-[10px] font-semibold ${isWsConnected ? 'text-green-600' : 'text-red-500'}`}>
                {isWsConnected ? 'En vivo' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Podio Top 3 */}
          {top3.length > 0 && (
            <motion.div
              className="flex items-end justify-center gap-4 h-48"
              initial="hidden"
              animate="visible"
            >
              {podiumOrder.map((player) => (
                <motion.div
                  key={player.id}
                  className="flex flex-col items-center"
                  variants={podiumVariants}
                  custom={player.position}
                >
                  {/* Medallón 3D que reemplaza al Avatar */}
                  <motion.div
                    className="relative mb-2 flex flex-col items-center justify-center w-24 h-24"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring' as const, stiffness: 300 }}
                  >
                    <MedalCanvas
                      type={player.position === 1 ? 'gold' : player.position === 2 ? 'silver' : 'bronze'}
                      avatar={player.avatar}
                    />

                    {/* Badge de posición */}
                    <div
                      className={`absolute -bottom-1 -right-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 ${medalBgColors[player.medal]} z-30`}
                    >
                      {player.position}º
                    </div>
                  </motion.div>

                  {/* Base del podio */}
                  <motion.div
                    className={`${podiumHeights[player.position]} w-20 glass-card rounded-t-xl flex flex-col items-center justify-center shadow-inner`}
                    initial={{ height: 0 }}
                    animate={{ height: player.position === 1 ? 112 : player.position === 2 ? 80 : 64 }}
                    transition={{ type: 'spring' as const, stiffness: 100, delay: 0.5 }}
                  >
                    <p 
                      className="text-[10px] font-semibold uppercase"
                      style={{ color: theme.currentTheme.textColor, opacity: 0.6 }}
                    >
                      {player.name}
                    </p>
                    <p
                      className={`font-bold ${player.position === 1 ? 'text-2xl' : 'text-lg'}`}
                      style={{ 
                        fontFamily: theme.currentTheme.headingFont,
                        color: theme.currentTheme.primaryColor 
                      }}
                    >
                      {player.score}
                    </p>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Lista de participantes */}
          <div className="flex-grow space-y-3">
            <div className="flex items-center justify-between px-4 mb-2">
              <span 
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: theme.currentTheme.textColor, opacity: 0.5 }}
              >
                Participante
              </span>
              <span 
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: theme.currentTheme.textColor, opacity: 0.5 }}
              >
                Puntos
              </span>
            </div>

            {/* Resto de jugadores */}
            {restOfPlayers.length > 0 ? restOfPlayers.map((entry) => {
              const player = entry.player;
              const isCurrentPlayer = player.id === currentPlayerId;

              if (isCurrentPlayer) {
                return (
                  <motion.div
                    key={player.id}
                    className="rounded-2xl p-4 flex items-center shadow-md relative overflow-hidden"
                    style={{
                      backgroundColor: `${theme.currentTheme.primaryColor}15`,
                      borderWidth: '2px',
                      borderColor: `${theme.currentTheme.primaryColor}50`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <div 
                      className="absolute top-0 right-0 p-1 text-white text-[8px] font-bold rounded-bl-lg"
                      style={{ backgroundColor: theme.currentTheme.primaryColor }}
                    >
                      TÚ
                    </div>
                    <div 
                      className="w-8 font-bold text-center"
                      style={{ 
                        fontFamily: theme.currentTheme.headingFont,
                        color: theme.currentTheme.primaryColor 
                      }}
                    >
                      {entry.position}
                    </div>
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl ml-2 mr-4 border-2"
                      style={{ 
                        backgroundColor: theme.currentTheme.bgColor,
                        borderColor: theme.currentTheme.primaryColor 
                      }}
                    >
                      {player.avatar}
                    </div>
                    <div className="flex-grow">
                      <p 
                        className="font-bold"
                        style={{ 
                          fontFamily: theme.currentTheme.headingFont,
                          color: theme.currentTheme.textColor 
                        }}
                      >
                        {player.name}
                      </p>
                    </div>
                    <div 
                      className="font-bold text-xl"
                      style={{ 
                        fontFamily: theme.currentTheme.headingFont,
                        color: theme.currentTheme.primaryColor 
                      }}
                    >
                      {player.score}
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                >
                  <Card variant="glass" padding="sm" className="flex items-center">
                    <div 
                      className="w-8 font-bold text-center"
                      style={{ 
                        fontFamily: theme.currentTheme.headingFont,
                        color: theme.currentTheme.textColor,
                        opacity: 0.5
                      }}
                    >
                      {entry.position}
                    </div>
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl ml-2 mr-4"
                      style={{ backgroundColor: theme.currentTheme.secondaryColor }}
                    >
                      {player.avatar}
                    </div>
                    <div className="flex-grow">
                      <p 
                        className="font-semibold"
                        style={{ 
                          fontFamily: theme.currentTheme.bodyFont,
                          color: theme.currentTheme.textColor 
                        }}
                      >
                        {player.name}
                      </p>
                    </div>
                    <div 
                      className="font-bold text-lg"
                      style={{ 
                        fontFamily: theme.currentTheme.headingFont,
                        color: theme.currentTheme.primaryColor 
                      }}
                    >
                      {player.score}
                    </div>
                  </Card>
                </motion.div>
              );
            }) : (
              <motion.p
                className="text-center py-4"
                style={{ color: theme.currentTheme.textColor, opacity: 0.5 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No hay más jugadores en el ranking
              </motion.p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-6 text-center space-y-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>🏠</span>}
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>

            {isCorkboardEnabled && (
            <Button
              variant="outline"
              size="md"
              fullWidth
              icon={<span>📸</span>}
              onClick={() => navigate('/corkboard')}
            >
              Cartelera de Fotos
            </Button>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Creciendo con magia • @tadevshi  • 2026
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
