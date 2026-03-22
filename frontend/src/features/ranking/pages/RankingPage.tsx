import { useState, useEffect } from 'react';
import { useEventNavigate } from '@/shared/hooks/useEventNavigate';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card, MedalCanvas, RankingSkeleton, useFeatureEnabled, CelebrationAnimation } from '@/shared';
import { useRanking } from '../hooks/useRanking';

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
      <PageLayout background="watercolor" showSparkles={false}>
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
      <PageLayout background="watercolor" showSparkles={false}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="font-display text-3xl text-accent mb-4">
              Error
            </h1>
            <p className="font-serif text-slate-600 mb-6">
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
      <PageLayout background="watercolor" showSparkles={false}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="font-display text-3xl text-accent mb-4">
              Aún no hay jugadores
            </h1>
            <p className="font-serif text-slate-600 mb-6">
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
    <PageLayout background="watercolor" showSparkles={false}>
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
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      {player.name}
                    </p>
                    <p
                      className={`font-serif font-bold text-primary ${player.position === 1 ? 'text-2xl' : 'text-lg'}`}
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
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Participante
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
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
                    className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 flex items-center shadow-md relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[8px] font-bold rounded-bl-lg">
                      TÚ
                    </div>
                    <div className="w-8 font-serif font-bold text-primary text-center">
                      {entry.position}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-xl ml-2 mr-4 border border-primary">
                      {player.avatar}
                    </div>
                    <div className="flex-grow">
                      <p className="font-serif text-slate-800 dark:text-slate-100 font-bold">
                        {player.name}
                      </p>
                    </div>
                    <div className="text-primary font-bold font-serif text-xl">
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
                    <div className="w-8 font-serif font-bold text-slate-400 text-center">
                      {entry.position}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-xl ml-2 mr-4">
                      {player.avatar}
                    </div>
                    <div className="flex-grow">
                      <p className="font-serif text-slate-700 dark:text-slate-200 font-semibold">
                        {player.name}
                      </p>
                    </div>
                    <div className="text-primary font-bold font-serif text-lg">
                      {player.score}
                    </div>
                  </Card>
                </motion.div>
              );
            }) : (
              <motion.p
                className="text-center text-slate-400 py-4"
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
