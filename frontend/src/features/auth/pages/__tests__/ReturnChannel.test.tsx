import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// The axios layer is mocked so the response interceptor of the client can be
// exercised directly, without a network and without a real navigation.
const { mockPost, mockGet, mockInterceptorsUse, mockInstance } =
  vi.hoisted(() => {
    const instance: any = vi.fn();
    instance.post = vi.fn();
    instance.get = vi.fn();
    instance.delete = vi.fn();
    instance.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    };
    return {
      mockPost: instance.post,
      mockGet: instance.get,
      mockInterceptorsUse: instance.interceptors.response.use,
      mockInstance: instance,
    };
  });

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockInstance),
    get: vi.fn(),
  },
}));

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  clearError: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../../store/authStore', () => ({ useAuthStore: () => auth }));

import { LoginPage } from '../LoginPage';
import { RegisterPage } from '../RegisterPage';
import { api } from '@/shared/lib/api';

// The interceptor of the axios layer that answers a 401. It is the first
// response interceptor registered by the client.
const authErrorHandler = mockInterceptorsUse.mock.calls[0]?.[1] as
  | ((error: unknown) => Promise<never>)
  | undefined;

const originalLocation = Object.getOwnPropertyDescriptor(window, 'location');

function stubLocation(pathname: string, search: string) {
  const replace = vi.fn();
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost',
      pathname,
      search,
      href: `http://localhost${pathname}${search}`,
      replace,
    },
    writable: true,
    configurable: true,
  });
  return replace;
}

function renderAuthRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/e/:slug" element={<div data-testid="event-page">Event</div>} />
        <Route path="/guest-join/:slug" element={<div data-testid="guest-invitation">Invitation</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function linkWithHref(href: string) {
  return screen.getAllByRole('link').find((link) => link.getAttribute('href') === href);
}

describe('unified return channel', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
    auth.error = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation);
    }
  });

  describe('the login page', () => {
    it('returns the visitor to a destination of the same origin', async () => {
      auth.isAuthenticated = true;
      renderAuthRoute(`/login?return_to=${encodeURIComponent('/e/private-event?tab=quiz')}`);

      expect(await screen.findByTestId('event-page')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });

    it('ignores a destination that points elsewhere', async () => {
      auth.isAuthenticated = true;
      renderAuthRoute(`/login?return_to=${encodeURIComponent('https://evil.example/steal')}`);

      expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('event-page')).not.toBeInTheDocument();
    });

    it('keeps the destination in the link to the registration', () => {
      const destination = '/e/private-event?tab=quiz';
      renderAuthRoute(`/login?return_to=${encodeURIComponent(destination)}`);

      expect(linkWithHref(`/register?return_to=${encodeURIComponent(destination)}`)).toBeInTheDocument();
    });

    it('does not put a foreign destination in the link to the registration', () => {
      renderAuthRoute(`/login?return_to=${encodeURIComponent('https://evil.example/steal')}`);

      expect(linkWithHref('/register')).toBeInTheDocument();
    });
  });

  describe('the registration page', () => {
    it('accepts a destination that is not an invitation path', async () => {
      auth.isAuthenticated = true;
      const destination = '/e/private-event?tab=quiz';
      renderAuthRoute(`/register?return_to=${encodeURIComponent(destination)}`);

      expect(await screen.findByTestId('event-page')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });

    it('keeps the destination in the link to the login', () => {
      const destination = '/e/private-event?tab=quiz';
      renderAuthRoute(`/register?return_to=${encodeURIComponent(destination)}`);

      expect(linkWithHref(`/login?return_to=${encodeURIComponent(destination)}`)).toBeInTheDocument();
    });

    it('keeps the invitation path as a destination', async () => {
      auth.isAuthenticated = true;
      const destination = '/guest-join/party?token=guest-token';
      renderAuthRoute(`/register?return_to=${encodeURIComponent(destination)}`);

      expect(await screen.findByTestId('guest-invitation')).toBeInTheDocument();
    });

    it('ignores a destination that points elsewhere', async () => {
      auth.isAuthenticated = true;
      renderAuthRoute(`/register?return_to=${encodeURIComponent('https://evil.example/steal')}`);

      expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    });
  });

  describe('the axios layer', () => {
    it('marks the read of the event so its failure reaches the caller', async () => {
      mockGet.mockResolvedValueOnce({ data: { slug: 'private-event' } });

      await api.getEventBySlug('private-event');

      expect(mockGet).toHaveBeenCalledWith(
        '/events/private-event',
        expect.objectContaining({ propagateAuthFailure: true }),
      );
    });

    it('redirects to the login keeping the destination of the visitor', async () => {
      const replace = stubLocation('/e/private-event', '?tab=quiz');
      localStorage.setItem('auth-token', 'stale-token');

      const error = {
        config: { url: '/admin/events', headers: {} },
        response: { status: 401 },
      };

      await expect(authErrorHandler?.(error)).rejects.toBeTruthy();

      expect(replace).toHaveBeenCalledWith(
        `/login?return_to=${encodeURIComponent('/e/private-event?tab=quiz')}`,
      );
      expect(localStorage.getItem('auth-token')).toBeNull();
    });

    it('lets the read of the event reach the caller with its status', async () => {
      const replace = stubLocation('/e/private-event', '');
      localStorage.setItem('auth-token', 'a-token');

      const error = {
        config: { url: '/events/private-event', headers: {}, propagateAuthFailure: true },
        response: { status: 401 },
      };

      await expect(authErrorHandler?.(error)).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(replace).not.toHaveBeenCalled();
      expect(localStorage.getItem('auth-token')).toBe('a-token');
    });

    it('lets the read of the event reach the caller when the refresh fails', async () => {
      const replace = stubLocation('/e/private-event', '');
      localStorage.setItem('auth-token', 'a-token');
      localStorage.setItem('auth-refresh', 'a-refresh-token');
      mockPost.mockRejectedValueOnce(new Error('refresh failed'));

      const error = {
        config: { url: '/events/private-event', headers: {}, propagateAuthFailure: true },
        response: { status: 401 },
      };

      await expect(authErrorHandler?.(error)).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(replace).not.toHaveBeenCalled();
      expect(localStorage.getItem('auth-token')).toBe('a-token');
    });

    it('lets a denied event reach the caller with its status', async () => {
      const replace = stubLocation('/e/private-event', '');
      localStorage.setItem('auth-token', 'a-token');

      const error = {
        config: { url: '/events/private-event', headers: {}, propagateAuthFailure: true },
        response: { status: 403 },
      };

      await expect(authErrorHandler?.(error)).rejects.toMatchObject({
        response: { status: 403 },
      });

      expect(replace).not.toHaveBeenCalled();
    });
  });
});
