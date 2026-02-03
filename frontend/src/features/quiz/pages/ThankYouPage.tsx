import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Header, PageLayout, Card } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { useRankingStore } from '@features/ranking/store/rankingStore';

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

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      <div className="flex flex-col items-center min-h-screen px-8 py-12 text-center">
        <div className="w-full max-w-md space-y-8">
          {/* Header personalizado */}
          <Header
            title="¡Gracias por participar!"
            subtitle={`${playerName}, tus respuestas han sido enviadas`}
            size="lg"
            decoration="lines"
          />

          {/* Card con puntaje */}
          <Card variant="glass" padding="lg" className="space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="font-serif text-lg text-slate-700 dark:text-slate-200">
              ¡Este es tu puntaje!
            </p>
            <div className="py-4">
              <span className="text-6xl font-display text-accent">{score}</span>
              <span className="text-xl text-slate-500"> /13</span>
            </div>
            <p className="text-sm text-slate-500">
              {score === 13 
                ? '¡PERFECTO! Conocés a Mile mejor que nadie 🌟'
                : score >= 10 
                ? '¡Excelente! Sos muy cercano/a a Mile ✨'
                : score >= 7 
                ? '¡Muy bien! Conocés bastante a Mile 👏'
                : score >= 4 
                ? 'No está mal, pero podés conocerla mejor 😊'
                : '¡A conocer más a Mile! 🤗'}
            </p>
          </Card>

          {/* Carrusel de otros jugadores */}
          {otherPlayers.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                Otros invitados jugando:
              </p>
              <div className="flex justify-center gap-3 overflow-x-auto py-2">
                {otherPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center space-y-1 min-w-[60px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-2xl border-2 border-white dark:border-gray-700 shadow-md">
                      {player.avatar}
                    </div>
                    <span className="text-xs text-gray-500">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>🏆</span>}
              onClick={() => navigate('/ranking')}
            >
              Ver Ranking
            </Button>

            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
