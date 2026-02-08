// Public API of Shared components
export { Button } from './components/Button';
export { Input } from './components/Input';
export { TextArea } from './components/TextArea';
export { Card } from './components/Card';
export { Header } from './components/Header';
export { PageLayout } from './components/PageLayout';
export { PageTransition, fadeInUp, staggerContainer } from './components/PageTransition';
export { ConfettiEffect, fireConfetti } from './components/Confetti';
export { ButterflyBackground } from './components/ButterflyBackground';

// 3D Components
export { MedalCanvas } from './3d';

// Hooks
export { 
  ScrollReveal, 
  ScrollStagger, 
  ScrollStaggerItem,
  scrollVariants 
} from './hooks/useScrollAnimation';

// API Client
export { api } from './lib/api';
export type { 
  Player, 
  RankingEntry, 
  CreatePlayerRequest, 
  SubmitQuizRequest, 
  SubmitQuizResponse 
} from './lib/api';
