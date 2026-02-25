import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WelcomePage, RegisterPage, QuizPage, ThankYouPage } from '@features/quiz';
import { RankingPage } from '@features/ranking';
import { CorkboardPage, SecretBoxPage } from '@features/postcards';
import { ErrorBoundary, FEATURES } from '@/shared';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import type { ReactNode } from 'react';

// === VARIANTES DE TRANSICIÓN ESPECÍFICAS ===

// 1. SLIDE UP: Para avance de bienvenida → registro
const slideUpVariants = {
  initial: { opacity: 0, y: 100, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    y: -50, 
    scale: 0.98,
    transition: { duration: 0.3 }
  },
};

// 2. SLIDE RIGHT: Para progresión registro → quiz
const slideRightVariants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: { duration: 0.25 }
  },
};

// 3. ZOOM CELEBRATION: Para quiz → thank you (momento especial)
const zoomVariants = {
  initial: { opacity: 0, scale: 0.8, y: 50 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: [0.34, 1.56, 0.64, 1], // Efecto spring suave
    }
  },
  exit: { 
    opacity: 0, 
    scale: 1.1,
    transition: { duration: 0.3 }
  },
};

// 4. SLIDE LEFT: Para thank you → ranking
const slideLeftVariants = {
  initial: { opacity: 0, x: -100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { duration: 0.25 }
  },
};

// 5. FADE ELEGANTE: Para ranking (transiciones suaves)
const fadeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { duration: 0.3 }
  },
};

// Wrapper animado configurable
function AnimatedPage({ 
  children, 
  variants 
}: { 
  children: ReactNode; 
  variants: any;
}) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// Componente que maneja las rutas con AnimatePresence
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* WELCOME: Entrada elegante desde abajo */}
        <Route 
          path="/" 
          element={
            <AnimatedPage variants={slideUpVariants}>
              <WelcomePage />
            </AnimatedPage>
          } 
        />
        
        {/* REGISTER: Slide desde la derecha (avance) */}
        <Route 
          path="/register" 
          element={
            <AnimatedPage variants={slideRightVariants}>
              <RegisterPage />
            </AnimatedPage>
          } 
        />
        
        {/* QUIZ: Slide desde la derecha (continuación) */}
        <Route 
          path="/quiz" 
          element={
            <AnimatedPage variants={slideRightVariants}>
              <QuizPage />
            </AnimatedPage>
          } 
        />
        
        {/* THANK YOU: Zoom celebración especial */}
        <Route 
          path="/thank-you" 
          element={
            <AnimatedPage variants={zoomVariants}>
              <ThankYouPage />
            </AnimatedPage>
          } 
        />
        
        {/* RANKING: Fade elegante desde la izquierda */}
        <Route 
          path="/ranking" 
          element={
            <AnimatedPage variants={slideLeftVariants}>
              <RankingPage />
            </AnimatedPage>
          } 
        />

        {/* CORKBOARD: Feature sorpresa — habilitado via VITE_ENABLE_CORKBOARD=true */}
        {FEATURES.CORKBOARD && (
          <Route 
            path="/corkboard" 
            element={
              <AnimatedPage variants={fadeVariants}>
                <CorkboardPage />
              </AnimatedPage>
            } 
          />
        )}

        {/* SECRET BOX: Link compartible para postales de invitados remotos */}
        {FEATURES.SECRET_BOX && (
          <Route
            path="/secret-box"
            element={
              <AnimatedPage variants={fadeVariants}>
                <SecretBoxPage />
              </AnimatedPage>
            }
          />
        )}
        
        {/* Ruta 404: Fade suave */}
        <Route 
          path="*" 
          element={
            <AnimatedPage variants={fadeVariants}>
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-display text-accent mb-4">404</h1>
                  <p className="font-serif text-slate-600">Página no encontrada</p>
                </div>
              </div>
            </AnimatedPage>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* ThemeToggle vive fuera del router para persistir entre rutas sin re-montar */}
        <ThemeToggle />
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App
