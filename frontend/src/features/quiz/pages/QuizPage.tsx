import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, TextArea, Header, PageLayout } from '@/shared';

// Preguntas del quiz
const favoriteQuestions = [
  { id: 'singer', label: '¿Cantante favorito?' },
  { id: 'flower', label: '¿Flor favorita?' },
  { id: 'drink', label: '¿Cuál es mi bebida favorita?' },
  { id: 'disney', label: '¿Película de Disney favorita?' },
  { id: 'season', label: '¿Estación del año preferida?' },
  { id: 'color', label: '¿Cuál es mi color favorito?' },
  { id: 'dislike', label: '¿Menciona algo que no me guste?' },
];

const preferenceQuestions = [
  { id: 'coffee', label: '¿Café o Té?', options: ['Café', 'Té'] },
  { id: 'place', label: '¿Playa o Montaña?', options: ['Playa', 'Montaña'] },
  { id: 'weather', label: '¿Frío o Calor?', options: ['Frío', 'Calor'] },
  { id: 'time', label: '¿Día o Noche?', options: ['Día', 'Noche'] },
  { id: 'food', label: '¿Pizza o Sushi?', options: ['Pizza', 'Sushi'] },
  { id: 'drink', label: '¿Tequila o Vino?', options: ['Tequila', 'Vino'] },
];

export function QuizPage() {
  const navigate = useNavigate();
  
  // Estado para todas las respuestas
  const [favorites, setFavorites] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');

  const handleFavoriteChange = (id: string, value: string) => {
    setFavorites((prev) => ({ ...prev, [id]: value }));
  };

  const handlePreferenceChange = (id: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    // Aquí enviaremos las respuestas al backend
    console.log({ favorites, preferences, description });
    navigate('/thank-you');
  };

  return (
    <PageLayout background="butterfly" showSparkles={false}>
      <div className="min-h-screen px-6 py-8 pb-24">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <Header
              title="¡Juguemos!"
              subtitle="¿Quién conoce más a la cumpleañera?"
              size="md"
              decoration="dots"
            />
          </div>

          {/* Sección 1: Favoritos */}
          <section className="space-y-5">
            {favoriteQuestions.map((q) => (
              <Input
                key={q.id}
                label={q.label}
                placeholder="Escribe aquí..."
                value={favorites[q.id] || ''}
                onChange={(e) => handleFavoriteChange(q.id, e.target.value)}
              />
            ))}
          </section>

          {/* Sección 2: Preferencias (This or That) */}
          <section className="space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
              <span className="font-serif italic text-accent dark:text-primary px-4 text-lg">
                ¿Qué prefiere la cumpleañera?
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {preferenceQuestions.map((q) => (
                <div key={q.id} className="flex flex-col items-center space-y-3">
                  <span className="font-serif italic text-base text-slate-700 dark:text-slate-200">
                    {q.label}
                  </span>
                  <div className="flex space-x-4">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handlePreferenceChange(q.id, opt)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          preferences[q.id] === opt
                            ? 'bg-accent border-accent scale-110'
                            : 'border-primary hover:bg-primary/20'
                        }`}
                        title={opt}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3: Descripción */}
          <section className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary" />
              <span className="font-serif italic text-accent dark:text-primary px-4 text-lg">
                Descríbeme en una oración
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary" />
            </div>

            <TextArea
              placeholder="Eres una persona..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </section>

          {/* Botón enviar */}
          <div className="pt-4 space-y-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<span>✉</span>}
              onClick={handleSubmit}
            >
              Enviar Respuestas
            </Button>

            <div className="flex items-center justify-center space-x-4 opacity-70">
              <span className="font-serif text-lg text-slate-600 dark:text-slate-300">
                Total puntos:
              </span>
              <div className="w-12 h-12 border-2 border-dashed border-primary rounded-full flex items-center justify-center font-bold text-accent text-xl">
                ?
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
