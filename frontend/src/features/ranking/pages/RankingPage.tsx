import { useNavigate } from 'react-router-dom';
import { Button, Header, PageLayout, Card } from '@/shared';
import { useRankingStore } from '../store/rankingStore';

const medalColors: Record<string, string> = {
  gold: 'border-gold',
  silver: 'border-silver',
  bronze: 'border-bronze',
};

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

export function RankingPage() {
  const navigate = useNavigate();
  
  // Obtener ranking ordenado del store
  const sortedRanking = useRankingStore((state) => state.getSortedRanking());
  const currentPlayerId = useRankingStore((state) => state.currentPlayerId);

  // Separar top 3 del resto
  const top3 = sortedRanking.slice(0, 3).map((player, index) => ({
    ...player,
    position: index + 1,
    medal: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze',
  }));
  
  // Reordenar para mostrar: 2do, 1ro, 3ro en el podio
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  
  const restOfPlayers = sortedRanking.slice(3);

  return (
    <PageLayout background="watercolor" showSparkles={false}>
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <Header
              title="Ranking"
              subtitle="¡Felicidades!"
              size="md"
              decoration="lines"
            />
          </div>

          {/* Podio Top 3 */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-4 h-48">
              {podiumOrder.map((player) => (
                <div key={player.id} className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative mb-2">
                    {player.position === 1 && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl">
                        👑
                      </span>
                    )}
                    <div
                      className={`w-${player.position === 1 ? '20' : '16'} h-${player.position === 1 ? '20' : '16'} rounded-full border-4 ${medalColors[player.medal]} p-1 bg-white dark:bg-slate-800 shadow-lg ${player.position === 1 ? 'scale-110' : ''}`}
                    >
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                        {player.avatar}
                      </div>
                    </div>
                    {/* Badge de posición */}
                    <div
                      className={`absolute -bottom-2 -right-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 ${medalBgColors[player.medal]}`}
                    >
                      {player.position}º
                    </div>
                  </div>

                  {/* Base del podio */}
                  <div
                    className={`${podiumHeights[player.position]} w-20 glass-card rounded-t-xl flex flex-col items-center justify-center shadow-inner`}
                  >
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      {player.name}
                    </p>
                    <p className={`font-serif font-bold text-primary ${player.position === 1 ? 'text-2xl' : 'text-lg'}`}>
                      {player.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
            {restOfPlayers.map((player, index) => {
              const position = index + 4;
              const isCurrentPlayer = player.id === currentPlayerId;
              
              if (isCurrentPlayer) {
                // Jugador actual destacado
                return (
                  <div
                    key={player.id}
                    className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 flex items-center shadow-md relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[8px] font-bold rounded-bl-lg">
                      TÚ
                    </div>
                    <div className="w-8 font-serif font-bold text-primary text-center">
                      {position}
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
                  </div>
                );
              }
              
              return (
                <Card
                  key={player.id}
                  variant="glass"
                  padding="sm"
                  className="flex items-center"
                >
                  <div className="w-8 font-serif font-bold text-slate-400 text-center">
                    {position}
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
              );
            })}
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
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
              Creciendo con magia • 2024
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
