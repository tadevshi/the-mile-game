import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input, Header, PageLayout, Card } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { api } from '@/shared/lib/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Zustand stores
  const setStorePlayerName = useQuizStore((state) => state.setPlayerName);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);

  const handleStart = async () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Resetear quiz por si acaso
      resetQuiz();
      
      // Crear jugador en el backend
      const player = await api.createPlayer({
        name: playerName.trim(),
        avatar: '👤',
      });
      
      // Guardar en store local
      setStorePlayerName(player.name);
      
      console.log('Player created:', player);
      
      navigate('/quiz');
    } catch (err) {
      console.error('Error creating player:', err);
      setError('Error al crear jugador. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
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
              <motion.div 
                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-4xl">👑</span>
              </motion.div>
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
                disabled={isLoading}
              />
            </div>

            {/* Botón */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>✨</span>}
              onClick={handleStart}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : '¡Listos para jugar!'}
            </Button>
          </Card>

          {/* Link para volver */}
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors"
            disabled={isLoading}
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
