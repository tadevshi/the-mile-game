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
export { ErrorBoundary } from './components/ErrorBoundary';
export { ThemeToggle } from './components/ThemeToggle';
export { EventLayout } from './components/EventLayout';
export { EventLoader } from './components/EventLoader';

// Stores
export { useThemeStore } from './store/themeStore';
export { useEventStore, useFeatureEnabled, type Event, type EventFeatures } from './store/eventStore';

// 3D Components
export { MedalCanvas } from './3d';

// Skeleton Components
export { 
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  RankingSkeleton,
  QuizSkeleton,
  SkeletonContainer
} from './components/Skeleton';

// Hooks
export { 
  ScrollReveal, 
  ScrollStagger, 
  ScrollStaggerItem,
  scrollVariants 
} from './hooks/useScrollAnimation';
export { usePullToRefresh } from './hooks/usePullToRefresh';
export { useEventNavigate } from './hooks/useEventNavigate';

// API Client
export { api } from './lib/api';

// Feature Flags
export { FEATURES } from './lib/featureFlags';
export type { 
  Player, 
  RankingEntry, 
  CreatePlayerRequest, 
  SubmitQuizRequest, 
  SubmitQuizResponse 
} from './lib/api';
