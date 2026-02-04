// Public API of Shared components
export { Button } from './components/Button';
export { Input } from './components/Input';
export { TextArea } from './components/TextArea';
export { Card } from './components/Card';
export { Header } from './components/Header';
export { PageLayout } from './components/PageLayout';
export { PageTransition, fadeInUp, staggerContainer } from './components/PageTransition';
export { ConfettiEffect, fireConfetti } from './components/Confetti';

// API Client
export { api } from './lib/api';
export type { 
  Player, 
  RankingEntry, 
  CreatePlayerRequest, 
  SubmitQuizRequest, 
  SubmitQuizResponse 
} from './lib/api';
