import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { RegisterPage } from '../RegisterPage';

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  clearError: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));
vi.mock('../../store/authStore', () => ({ useAuthStore: () => auth }));

function renderAuthRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/guest-join/:slug" element={<div data-testid="guest-invitation">Invitation</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function linkWithHref(href: string) {
  return screen.getAllByRole('link').find((link) => link.getAttribute('href') === href);
}

describe('guest invitation authentication return', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
    auth.error = null;
    vi.clearAllMocks();
  });

  it('preserves the guest invite target from login to registration', () => {
    const returnTo = '/guest-join/party?token=guest-token';
    renderAuthRoute(`/login?return_to=${encodeURIComponent(returnTo)}`);

    expect(linkWithHref(`/register?return_to=${encodeURIComponent(returnTo)}`)).toBeInTheDocument();
  });

  it('preserves the guest invite target from registration to login', () => {
    const returnTo = '/guest-join/party?token=guest-token';
    renderAuthRoute(`/register?return_to=${encodeURIComponent(returnTo)}`);

    expect(linkWithHref(`/login?return_to=${encodeURIComponent(returnTo)}`)).toBeInTheDocument();
  });

  it('returns a newly authenticated account to the guest invitation after registration', async () => {
    auth.isAuthenticated = true;
    const returnTo = '/guest-join/party?token=guest-token';
    renderAuthRoute(`/register?return_to=${encodeURIComponent(returnTo)}`);

    expect(await screen.findByTestId('guest-invitation')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('keeps ordinary registration on the dashboard', async () => {
    auth.isAuthenticated = true;
    renderAuthRoute('/register');

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('rejects an external return target and falls back to the dashboard', async () => {
    auth.isAuthenticated = true;
    renderAuthRoute('/register?return_to=https%3A%2F%2Fevil.example');

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('guest-invitation')).not.toBeInTheDocument();
  });
});
