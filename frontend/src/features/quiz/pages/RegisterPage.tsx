import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input, Header, PageLayout, Card, ScrollReveal, ScrollStagger, ScrollStaggerItem } from '@/shared';
import { useQuizStore } from '../store/quizStore';
import { api } from '@/shared/lib/api';

// Lista de emojis disponibles para avatar
const AVATAR_EMOJIS = [
  // Expresiones y caritas
  '😀', '😎', '🤓', '😍', '🥰', '🤠', '🥳', '😇',
  '🤩', '😋', '🤪', '😜', '🤗', '🤭', '🥸', '😴',
  '🤯', '🤠', '😎', '🧐', '🤓', '😈', '👽', '🤖',
  
  // Profesiones
  '👩‍⚕️', '👨‍⚕️', '👩‍🏫', '👨‍🏫', '👩‍🍳', '👨‍🍳',
  '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍🏭', '👨‍🏭',
  '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔧', '👨‍🔧',
  '👩‍🔬', '👨‍🔬', '👩‍🚀', '👨‍🚀', '👩‍🚒', '👨‍🚒',
  '👮‍♀️', '👮‍♂️', '💂‍♀️', '💂‍♂️', '👷‍♀️', '👷‍♂️',
  '👩‍⚖️', '👨‍⚖️', '🕵️‍♀️', '🕵️‍♂️', '👩‍🌾', '👨‍🌾',
  
  // Fantasía y magia
  '👸', '🤴', '🦄', '🧚', '🧚‍♂️', '🧚‍♀️', '🧞', '🧞‍♀️',
  '🧜‍♀️', '🧜‍♂️', '🧛‍♀️', '🧛‍♂️', '🧟‍♀️', '🧟‍♂️', '🧌', '🧝‍♀️',
  '🧝‍♂️', '🧙‍♀️', '🧙‍♂️', '🧝‍♀️', '🧝‍♂️', '👰‍♀️', '🤵‍♂️',
  
  // Animales tiernos
  '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐤',
  '🦋', '🐝', '🐞', '🦕', '🦖', '🐙', '🦄', '🦩',
  
  // Naturaleza y objetos
  '🌸', '🌺', '🌻', '🌷', '🌹', '🌵', '🌲', '🌳',
  '⭐', '🌟', '✨', '☀️', '🌙', '☁️', '🌈', '🔥',
  
  // Comida y dulces
  '🧁', '🍰', '🎂', '🍭', '🍬', '🍫', '🍩', '🍪',
  '🍦', '🍧', '🍨', '🍿', '🥤', '🧃', '🧋', '🍵',
  
  // Celebración y diversión
  '🎈', '🎉', '🎊', '🎀', '🎁', '🎪', '🎭', '🎨',
  '🎸', '🎺', '🎻', '🥁', '🎹', '🎤', '🎮', '🎯',
  
  // Corazones y amor
  '💖', '💕', '💓', '💗', '💘', '💝', '💞', '💟',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  
  // Deportes y actividades
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱',
  '🏓', '🏸', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣',
  '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🏋️',
  
  // Transporte y viajes
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
  '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️',
  '✈️', '🚁', '🚀', '🛸', '🚤', '⛵', '🛳️', '🚢',
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👸');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
        avatar: selectedAvatar,
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
      <div className="flex flex-col items-center flex-1 px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <ScrollReveal variant="fadeDown" className="text-center">
            <Header
              title="Registro"
              subtitle="¿Quién juega hoy?"
              size="md"
              decoration="lines"
            />
          </ScrollReveal>

          {/* Card de registro */}
          <ScrollReveal variant="scaleUp" delay={0.1}>
            <Card variant="glass" padding="lg" className="space-y-8">
              <ScrollStagger className="flex flex-col items-center space-y-3">
                <ScrollStaggerItem>
                  <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-5xl">{selectedAvatar}</span>
                  </motion.div>
                </ScrollStaggerItem>
                <ScrollStaggerItem>
                  <p className="text-xs text-slate-400">
                    Tocá para cambiar tu avatar
                  </p>
                </ScrollStaggerItem>

                {/* Selector de emojis */}
                {showEmojiPicker && (
                  <ScrollStaggerItem>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-pink-100 max-h-60 overflow-y-auto"
                    >
                      <div className="grid grid-cols-6 gap-2">
                        {AVATAR_EMOJIS.map((emoji) => (
                          <motion.button
                            key={emoji}
                            onClick={() => {
                              setSelectedAvatar(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all ${
                              selectedAvatar === emoji
                                ? 'bg-primary text-white shadow-md'
                                : 'hover:bg-pink-50'
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-[10px] text-center text-slate-400 mt-2">
                        Opcional - Si no elegís, usaremos uno por defecto
                      </p>
                    </motion.div>
                  </ScrollStaggerItem>
                )}
              </ScrollStagger>

              {/* Input de nombre */}
              <ScrollReveal variant="fadeUp" delay={0.2}>
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
              </ScrollReveal>

              {/* Botón */}
              <ScrollReveal variant="fadeUp" delay={0.3}>
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
              </ScrollReveal>
            </Card>
          </ScrollReveal>

          {/* Link para volver */}
          <ScrollReveal variant="fadeUp" delay={0.4}>
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-sm text-gray-400 hover:text-primary transition-colors"
              disabled={isLoading}
            >
              ← Volver al inicio
            </button>
          </ScrollReveal>
        </div>
      </div>
    </PageLayout>
  );
}
