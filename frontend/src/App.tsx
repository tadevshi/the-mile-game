import { useState } from 'react';
import { Button, Input, TextArea, Card, Header, PageLayout } from './shared';

// Página de demostración de componentes
function App() {
  const [inputValue, setInputValue] = useState('');
  const [textAreaValue, setTextAreaValue] = useState('');

  return (
    <PageLayout background="watercolor" showSparkles={true}>
      <div className="container mx-auto px-6 py-12 max-w-md space-y-12">
        
        {/* Header */}
        <Header 
          title="¡Bienvenidos!" 
          subtitle="Component Showcase" 
          size="lg"
          decoration="lines"
        />

        {/* Sección de Botones */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-slate-600 dark:text-slate-300">Botones</h2>
          
          <div className="space-y-3">
            <Button variant="primary" size="lg" fullWidth icon={<span>→</span>}>
              Empezar Juego
            </Button>
            
            <Button variant="secondary" size="md">
              Secundario
            </Button>
            
            <Button variant="outline" size="sm">
              Outline
            </Button>
            
            <Button variant="primary" isLoading>
              Cargando...
            </Button>
          </div>
        </section>

        {/* Sección de Inputs */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-slate-600 dark:text-slate-300">Inputs</h2>
          
          <div className="space-y-4">
            <Input
              label="¿Cantante favorito?"
              placeholder="Escribe aquí..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            
            <Input
              label="Email"
              type="email"
              placeholder="ejemplo@mail.com"
              error="Este campo es requerido"
            />
            
            <TextArea
              label="Descríbeme en una oración"
              placeholder="Eres una persona..."
              value={textAreaValue}
              onChange={(e) => setTextAreaValue(e.target.value)}
              rows={3}
            />
          </div>
        </section>

        {/* Sección de Cards */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-slate-600 dark:text-slate-300">Cards</h2>
          
          <div className="space-y-3">
            <Card variant="glass">
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Glass Card</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Efecto vidrio esmerilado</p>
            </Card>
            
            <Card variant="default" isHoverable>
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Hover Card</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pasa el mouse por encima</p>
            </Card>
            
            <Card variant="outlined" isPressable>
              <h3 className="font-serif font-bold text-slate-800 dark:text-slate-100">Pressable Card</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Haz clic para ver efecto</p>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          The Mile Game • Component Library
        </p>
      </div>
    </PageLayout>
  );
}

export default App
