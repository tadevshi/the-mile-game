import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RegisterPage, QuizPage, ThankYouPage } from '@features/quiz';
import { RankingPage } from '@features/ranking';
import { CorkboardPage, SecretBoxPage } from '@features/postcards';
import { AdminPage } from '@features/admin';
import { LoginPage, RegisterPage as AuthRegisterPage } from '@/features/auth';
import { DashboardPage, CreateEventPage } from '@/features/dashboard';
import { LandingPage } from '@/features/landing';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { ErrorBoundary, EventLayout, EventLoader, useFeatureEnabled } from '@/shared';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import type { ReactNode } from 'react';

import { EventWizardPage } from '@/features/event-wizard';
import { EventAdminPage } from '@/features/event-admin';
import { EventLandingPage } from '@/features/event-public';

// === VARIANTES DE TRANSICIÓN ESPECÍFICAS ===

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

const zoomVariants = {
  initial: { opacity: 0, scale: 0.8, y: 50 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1],
    }
  },
  exit: {
    opacity: 0,
    scale: 1.1,
    transition: { duration: 0.3 }
  },
};

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

// ==========================================
// EVENT-SCOPED PUBLIC ROUTES (/e/:slug/*)
// ==========================================

function EventQuizPage() {
  const quizEnabled = useFeatureEnabled('quiz');

  if (!quizEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display text-accent mb-4">Quiz no disponible</h1>
          <p className="font-serif text-slate-500">Este evento no tiene el quiz habilitado.</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage variants={slideRightVariants}>
      <QuizPage />
    </AnimatedPage>
  );
}

function EventRankingPage() {
  return (
    <AnimatedPage variants={slideLeftVariants}>
      <RankingPage />
    </AnimatedPage>
  );
}

function EventCorkboardPage() {
  const corkboardEnabled = useFeatureEnabled('corkboard');

  if (!corkboardEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display text-accent mb-4">Cartelera no disponible</h1>
          <p className="font-serif text-slate-500">Este evento no tiene la cartelera habilitada.</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage variants={fadeVariants}>
      <CorkboardPage />
    </AnimatedPage>
  );
}

// ==========================================
// LEGACY ROUTES (backward compatibility)
// ==========================================

function LegacyRoutes() {
  return (
    <Routes>
      {/* PUBLIC AUTH ROUTES */}
      <Route
        path="/login"
        element={
          <AnimatedPage variants={slideUpVariants}>
            <LoginPage />
          </AnimatedPage>
        }
      />
      <Route
        path="/register"
        element={
          <AnimatedPage variants={slideUpVariants}>
            <AuthRegisterPage />
          </AnimatedPage>
        }
      />

      {/* PROTECTED DASHBOARD ROUTES */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AnimatedPage variants={fadeVariants}>
              <DashboardPage />
            </AnimatedPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/new"
        element={
          <ProtectedRoute>
            <AnimatedPage variants={slideUpVariants}>
              <CreateEventPage />
            </AnimatedPage>
          </ProtectedRoute>
        }
      />

      {/* LANDING PAGE */}
      <Route
        path="/"
        element={
          <AnimatedPage variants={slideUpVariants}>
            <LandingPage />
          </AnimatedPage>
        }
      />

      {/* REGISTER: Slide desde la derecha (avance) */}
      <Route
        path="/quiz-register"
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

      {/* CORKBOARD */}
      <Route
        path="/corkboard"
        element={
          <AnimatedPage variants={fadeVariants}>
            <CorkboardPage />
          </AnimatedPage>
        }
      />

      {/* SECRET BOX */}
      <Route
        path="/secret-box"
        element={
          <AnimatedPage variants={fadeVariants}>
            <SecretBoxPage />
          </AnimatedPage>
        }
      />

      {/* ADMIN: Panel de control para revelar Secret Box */}
      <Route
        path="/admin"
        element={
          <AnimatedPage variants={fadeVariants}>
            <AdminPage />
          </AnimatedPage>
        }
      />

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
  );
}

// Componente que maneja las rutas con AnimatePresence
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ─────────────────────────────────────────
           NEW ROUTES: /wizard/new (3-step event creation)
           ───────────────────────────────────────── */}
        <Route
          path="/wizard/new"
          element={
            <ProtectedRoute>
              <AnimatedPage variants={slideUpVariants}>
                <EventWizardPage />
              </AnimatedPage>
            </ProtectedRoute>
          }
        />

        {/* ─────────────────────────────────────────
           NEW ROUTES: /admin/:slug (tabbed event admin)
           ───────────────────────────────────────── */}
        <Route
          path="/admin/:slug"
          element={
            <ProtectedRoute>
              <AnimatedPage variants={fadeVariants}>
                <EventAdminPage />
              </AnimatedPage>
            </ProtectedRoute>
          }
        />

        {/* ─────────────────────────────────────────
           NEW ROUTES: /e/:slug/* (event public pages)
           ───────────────────────────────────────── */}
        <Route path="/e/:slug">
          {/* Landing page */}
          <Route index element={
            <EventLoader>
              <AnimatedPage variants={fadeVariants}>
                <EventLandingPage />
              </AnimatedPage>
            </EventLoader>
          } />

          {/* Quiz inside event */}
          <Route path="quiz" element={
            <EventLoader>
              <EventLayout>
                <EventQuizPage />
              </EventLayout>
            </EventLoader>
          } />

          {/* Ranking inside event */}
          <Route path="ranking" element={
            <EventLoader>
              <EventLayout>
                <EventRankingPage />
              </EventLayout>
            </EventLoader>
          } />

          {/* Corkboard inside event */}
          <Route path="corkboard" element={
            <EventLoader>
              <EventCorkboardPage />
            </EventLoader>
          } />

          {/* Register inside event */}
          <Route path="register" element={
            <EventLoader>
              <EventLayout>
                <AnimatedPage variants={slideRightVariants}>
                  <RegisterPage />
                </AnimatedPage>
              </EventLayout>
            </EventLoader>
          } />

          {/* Thank you inside event */}
          <Route path="thank-you" element={
            <EventLoader>
              <EventLayout>
                <AnimatedPage variants={zoomVariants}>
                  <ThankYouPage />
                </AnimatedPage>
              </EventLayout>
            </EventLoader>
          } />

          {/* Catch-all for event sub-routes */}
          <Route path="*" element={
            <EventLoader>
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-display text-accent mb-4">404</h1>
                  <p className="font-serif text-slate-600">Página no encontrada en este evento</p>
                </div>
              </div>
            </EventLoader>
          } />
        </Route>

        {/* LEGACY ROUTES: todas las demás rutas */}
        <Route path="/*" element={<LegacyRoutes />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeToggle />
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App
