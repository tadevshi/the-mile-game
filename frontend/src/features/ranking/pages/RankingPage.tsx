import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card, MedalCanvas, ScrollReveal, ScrollStagger, ScrollStaggerItem } from '@/shared';
import { useWebSocket } from '@/shared/hooks';
import { api, type RankingEntry } from '@/shared/lib/api';

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
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

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

// WebSocket URL - usar la misma URL que el API pero con ws://
const WS_URL = import.meta.env.VITE_WS_URL || 
  (window.location.protocol === 'https:' 
    ? `wss://${window.location.host}/ws` 
    : `ws://${window.location.host}/ws`);

export function RankingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Estado de conexión WebSocket
  const [isWsConnected, setIsWsConnected] = useState(false);

  // WebSocket para ranking en tiempo real
  useWebSocket(WS_URL, {
    onMessage: (message) => {
      // El backend envía 'ranking' no 'data'
      const rankingData = (message as { ranking?: RankingEntry[] }).ranking;
      if (message.type === 'ranking_update' && Array.isArray(rankingData)) {
        console.log('[WebSocket] Ranking updated:', rankingData);
        setRanking(rankingData);
      }
    },
    onConnect: () => {
      console.log('[RankingPage] WebSocket connected');
      setIsWsConnected(true);
    },
    onDisconnect: () => {
      console.log('[RankingPage] WebSocket disconnected');
      setIsWsConnected(false);
    },
    onError: (error) => {
      console.error('[RankingPage] WebSocket error:', error);
      setIsWsConnected(false);
    },
  });

  // Cargar ranking inicial desde el API
  useEffect(() => {
    const loadRanking = async () => {
      try {
        setIsLoading(true);
        const data = await api.getRanking();
        setRanking(data);
        
        // Obtener el ID del jugador actual del API client
        const playerId = api.getPlayerId();
        setCurrentPlayerId(playerId);
        
        setError('');
      } catch (err) {
        console.error('Error loading ranking:', err);
        setError('Error al cargar el ranking. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRanking();
  }, []);

  // Separar top 3 del resto
  const top3 = ranking.slice(0, 3).map((entry) => ({
    ...entry.player,
    position: entry.position,
    medal: entry.position === 1 ? 'gold' : entry.position === 2 ? 'silver' : 'bronze',
  }));

  // Reordenar para mostrar: 2do, 1ro, 3ro en el podio
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  const restOfPlayers = ranking.slice(3);

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <PageLayout background="watercolor" showSparkles={false}>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl mb-4">🏆</div>
            <p className="font-serif text-slate-500">Cargando ranking...</p>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  // Si hay error
  if (error) {
    return (
      <PageLayout background="watercolor" showSparkles={false}>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
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
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
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
      <motion.div
        className="min-h-screen px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-md mx-auto space-y-6">
          {/* Header con indicador de conexión */}
          <motion.div variants={itemVariants} className="text-center relative">
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
          </motion.div>

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
                    
                    {/* Badge de posición (se mantiene para claridad) */}
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
          <ScrollReveal variant="fadeUp" className="flex-grow">
            <ScrollStagger className="space-y-3">
              <div className="flex items-center justify-between px-4 mb-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Participante
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Puntos
                </span>
              </div>

              {/* Resto de jugadores */}
              {restOfPlayers.map((entry) => {
                const player = entry.player;
                const isCurrentPlayer = player.id === currentPlayerId;

                if (isCurrentPlayer) {
                  // Jugador actual destacado
                  return (
                    <ScrollStaggerItem key={player.id}>
                      <motion.div
                        className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 flex items-center shadow-md relative overflow-hidden"
                        whileHover={{ scale: 1.02, x: 5 }}
                        layout
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
                    </ScrollStaggerItem>
                  );
                }

                return (
                  <ScrollStaggerItem key={player.id}>
                    <motion.div whileHover={{ scale: 1.02, x: 5 }}>
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
                  </ScrollStaggerItem>
                );
              })}
            </ScrollStagger>
          </ScrollReveal>

          {/* Footer */}
          <motion.div className="mt-auto pt-6 text-center space-y-4" variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<span>🏠</span>}
                onClick={() => navigate('/')}
              >
                Volver al inicio
              </Button>
            </motion.div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Creciendo con magia • 2024
            </p>
          </motion.div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
