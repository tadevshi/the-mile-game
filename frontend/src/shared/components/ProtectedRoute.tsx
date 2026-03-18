import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);

  // Give hydration a moment to complete before showing redirect
  useEffect(() => {
    if (hasHydrated) {
      // Small delay to prevent flash
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated]);

  // Show loading while hydrating or during transition
  if (!hasHydrated || showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // After hydration, check auth
  if (!isAuthenticated) {
    // Redirect to login, save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
