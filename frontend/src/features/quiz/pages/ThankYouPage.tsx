import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Header, PageLayout, Card } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { useRankingStore } from '@features/ranking/store/rankingStore';
import { ConfettiEffect } from '@/shared/components/Confetti';

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const scoreVariants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
      delay: 0.5,
    },
  },
};

export function ThankYouPage() {
  const navigate = useNavigate();
  
  // Datos reales del store
  const playerName = useQuizStore((state) => state.playerName);
  const score = useQuizStore((state) => state.score);
  const hasCompleted = useQuizStore((state) => state.hasCompleted);
  
  // Ranking para mostrar otros jugadores
  const players = useRankingStore((state) => state.players);
  const currentPlayerId = useRankingStore((state) => state.currentPlayerId);
  
  // Filtrar solo los otros jugadores (no el actual) para el carrusel
  const otherPlayers = players.filter((p) => p.id !== currentPlayerId).slice(0, 5);

  // Si no completó el quiz, redirigir al inicio
  useEffect(() => {
    if (!hasCompleted) {
      navigate('/');
    }
  }, [hasCompleted, navigate]);

  // Mensaje según puntaje
  const getMessage = () => {
    if (score === 13) return '¡PERFECTO! Conocés a Mile mejor que nadie 🌟';
    if (score >= 10) return '¡Excelente! Sos muy cercano/a a Mile ✨';
    if (score >= 7) return '¡Muy bien! Conocés bastante a Mile 👏';
    if (score >= 4) return 'No está mal, pero podés conocerla mejor 😊';
    return '¡A conocer más a Mile! 🤗';
  };

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      {/* Efecto confetti basado en puntaje */}
      <ConfettiEffect score={score} isActive={hasCompleted} />
      
      <motion.div 
        className="flex flex-col items-center min-h-screen px-8 py-12 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Header personalizado */}
          <motion.div variants={itemVariants}>
            <Header
              title="¡Gracias por participar!"
              subtitle={`${playerName}, tus respuestas han sido enviadas`}
              size="lg"
              decoration="lines"
            />
          </motion.div>

          {/* Card con puntaje */}
          <motion.div variants={itemVariants}>
            <Card variant="glass" padding="lg" className="space-y-4">
              <motion.div 
                className="text-6xl"
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.8,
                  ease: "easeInOut"
                }}
              >
                🎉
              </motion.div>
              
              <p className="font-serif text-lg text-slate-700 dark:text-slate-200">
                ¡Este es tu puntaje!
              </p>
              
              <motion.div 
                className="py-4"
                variants={scoreVariants}
              >
                <motion.span 
                  className="text-6xl font-display text-accent inline-block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {score}
                </motion.span>
                <span className="text-xl text-slate-500"> /13</span>
              </motion.div>
              
              <motion.p 
                className="text-sm text-slate-500 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {getMessage()}
              </motion.p>
            </Card>
          </motion.div>

          {/* Carrusel de otros jugadores */}
          {otherPlayers.length > 0 && (
            <motion.div 
              className="space-y-4"
              variants={itemVariants}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                Otros invitados jugando:
              </p>
              <motion.div 
                className="flex justify-center gap-3 overflow-x-auto py-2"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.1, delayChildren: 1 }
                  }
                }}
              >
                {otherPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    className="flex flex-col items-center space-y-1 min-w-[60px]"
                    variants={{
                      hidden: { opacity: 0, scale: 0 },
                      visible: { 
                        opacity: 1, 
                        scale: 1,
                        transition: { type: "spring" as const, stiffness: 300, damping: 20 }
                      }
                    }}
                    whileHover={{ scale: 1.1, y: -5 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-2xl border-2 border-white dark:border-gray-700 shadow-md">
                      {player.avatar}
                    </div>
                    <span className="text-xs text-gray-500">{player.name}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Botones */}
          <motion.div 
            className="space-y-3"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<span>🏆</span>}
                onClick={() => navigate('/ranking')}
              >
                Ver Ranking
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => navigate('/')}
              >
                Volver al inicio
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
