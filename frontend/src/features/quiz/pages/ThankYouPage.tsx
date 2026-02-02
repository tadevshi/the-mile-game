import { useNavigate } from 'react-router-dom';
import { Button, Header, PageLayout, Card } from '@/shared';

// Mock de otros jugadores (después vendrá del backend)
const otherPlayers = [
  { name: 'María', avatar: '👩' },
  { name: 'Sofía', avatar: '👧' },
  { name: 'Lucía', avatar: '👱‍♀️' },
  { name: 'Elena', avatar: '👩‍🦰' },
  { name: 'Valentina', avatar: '👸' },
];

export function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      <div className="flex flex-col items-center min-h-screen px-8 py-12 text-center">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <Header
            title="¡Gracias por participar!"
            subtitle="Tus respuestas han sido enviadas"
            size="lg"
            decoration="lines"
          />

          {/* Mensaje */}
          <Card variant="glass" padding="lg" className="space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="font-serif text-lg text-slate-700 dark:text-slate-200">
              ¡Espera los resultados para ver qué tanto conoces a la cumpleañera!
            </p>
          </Card>

          {/* Carrusel de otros jugadores */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
              Otros invitados jugando:
            </p>
            <div className="flex justify-center gap-3 overflow-x-auto py-2">
              {otherPlayers.map((player, index) => (
                <div
                  key={index}
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
