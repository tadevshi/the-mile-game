import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // Read token directly from localStorage (synchronous)
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  const hasToken = !!token && token !== 'undefined' && token !== 'null';

  // Show loading while store is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, white)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check both store state and localStorage
  const authenticated = isAuthenticated || hasToken;

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
