import { useNavigate } from 'react-router-dom';
import { Button, Header, PageLayout, Card } from '@/shared';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      <div className="flex flex-col items-center min-h-screen px-8 py-12 text-center">
        {/* Sección superior - Título */}
        <div className="w-full h-1/3 flex flex-col items-center justify-center relative mt-4">
          {/* Decoración mariposas SVG */}
          <div className="absolute -top-4 -left-2 transform -rotate-12 opacity-80">
            <svg className="text-primary w-12 h-12" fill="currentColor" viewBox="0 0 100 100">
              <path d="M50 50 C 70 20, 100 30, 95 60 C 90 80, 60 70, 50 60 C 40 70, 10 80, 5 60 C 0 30, 30 20, 50 50" />
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 transform rotate-45 opacity-60 scale-75">
            <svg className="text-accent w-14 h-14" fill="currentColor" viewBox="0 0 100 100">
              <path d="M50 50 C 70 20, 100 30, 95 60 C 90 80, 60 70, 50 60 C 40 70, 10 80, 5 60 C 0 30, 30 20, 50 50" />
            </svg>
          </div>

          <Header
            title="¡Bienvenidos a mi Cumpleaños!"
            subtitle="Mágica Celebración"
            size="lg"
            decoration="lines"
          />
        </div>

        {/* Sección central - Imagen */}
        <div className="flex-1 flex items-center justify-center py-6">
          <Card variant="glass" padding="lg" className="rounded-full p-4 relative">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full scale-105" />
            {/* Placeholder para la foto de Mile */}
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-xl">
              <span className="font-display text-6xl text-white">M</span>
            </div>
          </Card>
        </div>

        {/* Sección inferior - CTA */}
        <div className="w-full max-w-sm space-y-6 pb-8">
          <div className="space-y-1">
            <p className="font-serif italic text-2xl text-accent dark:text-primary">
              ¿Qué tanto me conoces?
            </p>
            <div className="flex justify-center gap-1">
              <div className="h-1 w-10 bg-primary/60 rounded-full" />
              <div className="h-1 w-1 bg-primary/30 rounded-full" />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<span>→</span>}
            onClick={() => navigate('/register')}
          >
            Empezar Juego
          </Button>

          <p className="text-gray-400 dark:text-gray-500 text-xs italic tracking-wide">
            Prepárate para la diversión
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
