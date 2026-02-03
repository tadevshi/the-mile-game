import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Header, PageLayout, Card } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { useRankingStore } from '@features/ranking/store/rankingStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  
  // Zustand stores
  const setStorePlayerName = useQuizStore((state) => state.setPlayerName);
  const addRankingPlayer = useRankingStore((state) => state.addPlayer);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);

  const handleStart = () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    
    // Resetear quiz por si acaso
    resetQuiz();
    
    // Guardar en store de quiz
    setStorePlayerName(playerName);
    
    // Agregar al ranking (inicialmente con score 0)
    addRankingPlayer({
      name: playerName,
      score: 0,
      avatar: '👤',
    });
    
    navigate('/quiz');
  };

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      <div className="flex flex-col items-center min-h-screen px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <Header
              title="Registro"
              subtitle="¿Quién juega hoy?"
              size="md"
              decoration="lines"
            />
          </div>

          {/* Card de registro */}
          <Card variant="glass" padding="lg" className="space-y-8">
            {/* Avatar decorativo */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <span className="text-4xl">👑</span>
              </div>
            </div>

            {/* Input de nombre */}
            <div className="space-y-2">
              <Input
                label="Nombre de la Princesa/Invitado"
                placeholder="Escribe tu nombre..."
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError('');
                }}
                error={error}
              />
            </div>

            {/* Botón */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>✨</span>}
              onClick={handleStart}
            >
              ¡Listos para jugar!
            </Button>
          </Card>

          {/* Link para volver */}
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
