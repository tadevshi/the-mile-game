import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: () => auth,
}));

function LocationMarker() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="router-state">{JSON.stringify(location.state ?? null)}</div>
    </div>
  );
}

function renderProtectedRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LocationMarker />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/e/:slug"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Event</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute return channel', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sends the visitor to the login with the destination in the query parameter', async () => {
    renderProtectedRoute('/dashboard?tab=stats');

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/login?return_to=%2Fdashboard%3Ftab%3Dstats',
    );
  });

  it('keeps the query of the destination', async () => {
    renderProtectedRoute('/e/private-event');

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/login?return_to=%2Fe%2Fprivate-event',
    );
  });

  it('does not use the router state as a second channel', async () => {
    renderProtectedRoute('/dashboard');

    await screen.findByTestId('location');
    expect(screen.getByTestId('router-state')).toHaveTextContent('null');
  });

  it('renders the protected content when the visitor is authenticated', () => {
    auth.isAuthenticated = true;

    renderProtectedRoute('/dashboard');

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('renders the protected content when the session token is in storage', () => {
    localStorage.setItem('auth-token', 'a-token');

    renderProtectedRoute('/dashboard');

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
