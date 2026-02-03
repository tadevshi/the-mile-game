import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WelcomePage, RegisterPage, QuizPage, ThankYouPage } from '@features/quiz';
import { RankingPage } from '@features/ranking';
import type { ReactNode } from 'react';

// Variantes de animación para transiciones
const pageVariants = {
  initial: {
    opacity: 0,
    x: 50,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
};

// Wrapper animado para cada página
function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
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
        {/* Rutas del Quiz */}
        <Route 
          path="/" 
          element={
            <AnimatedPage>
              <WelcomePage />
            </AnimatedPage>
          } 
        />
        <Route 
          path="/register" 
          element={
            <AnimatedPage>
              <RegisterPage />
            </AnimatedPage>
          } 
        />
        <Route 
          path="/quiz" 
          element={
            <AnimatedPage>
              <QuizPage />
            </AnimatedPage>
          } 
        />
        <Route 
          path="/thank-you" 
          element={
            <AnimatedPage>
              <ThankYouPage />
            </AnimatedPage>
          } 
        />
        
        {/* Ruta del Ranking */}
        <Route 
          path="/ranking" 
          element={
            <AnimatedPage>
              <RankingPage />
            </AnimatedPage>
          } 
        />
        
        {/* Ruta 404 */}
        <Route 
          path="*" 
          element={
            <AnimatedPage>
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
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App
