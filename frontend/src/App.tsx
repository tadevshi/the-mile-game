import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WelcomePage, RegisterPage, QuizPage, ThankYouPage } from '@features/quiz';
import { RankingPage } from '@features/ranking';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas del Quiz */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        
        {/* Ruta del Ranking */}
        <Route path="/ranking" element={<RankingPage />} />
        
        {/* Ruta 404 */}
        <Route path="*" element={<div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-display text-accent mb-4">404</h1>
            <p className="font-serif text-slate-600">Página no encontrada</p>
          </div>
        </div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
