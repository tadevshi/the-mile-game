import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { GuestInvitationPage } from '../GuestInvitationPage';

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
vi.mock('@/shared/lib/api', () => ({
  api: { acceptGuestInvitation: vi.fn() },
}));

function LoginMarker() {
  const location = useLocation();
  return <div data-testid="login-location">{location.pathname}{location.search}</div>;
}

function EventMarker() {
  const location = useLocation();
  const { slug } = useParams();
  return <div data-testid="event-location">{slug}|{location.pathname}</div>;
}

function renderInvitation(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/guest-join/:slug" element={<GuestInvitationPage />} />
        <Route path="/login" element={<LoginMarker />} />
        <Route path="/e/:slug" element={<EventMarker />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestInvitationPage', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    vi.clearAllMocks();
  });

  it('rejects a missing token without calling guest acceptance', () => {
    renderInvitation('/guest-join/party');

    expect(screen.getByText('El link no contiene un token de invitación.')).toBeInTheDocument();
    expect(api.acceptGuestInvitation).not.toHaveBeenCalled();
  });

  it('returns an unauthenticated invitee to the same guest link after login', async () => {
    renderInvitation('/guest-join/party?token=guest-token');

    await waitFor(() => expect(screen.getByTestId('login-location')).toBeInTheDocument());
    const loginUrl = screen.getByTestId('login-location').textContent ?? '';
    const returnTo = new URLSearchParams(loginUrl.slice(loginUrl.indexOf('?') + 1)).get('return_to');

    expect(loginUrl).toMatch(/^\/login\?/);
    expect(returnTo).toBe('/guest-join/party?token=guest-token');
    expect(api.acceptGuestInvitation).not.toHaveBeenCalled();
  });

  it('accepts the guest-only invitation and sends the guest to the public event', async () => {
    auth.isAuthenticated = true;
    vi.mocked(api.acceptGuestInvitation).mockResolvedValueOnce({
      message: 'Guest invitation accepted',
      event_id: 'event-1',
      user_id: 'user-1',
    });

    renderInvitation('/guest-join/party?token=guest-token');

    expect(await screen.findByText(/Ya formas parte del evento como invitado/)).toBeInTheDocument();
    expect(screen.getByText(/no podés administrar el evento/i)).toBeInTheDocument();
    expect(api.acceptGuestInvitation).toHaveBeenCalledExactlyOnceWith('guest-token');

    fireEvent.click(screen.getByRole('button', { name: 'Ir al evento' }));
    await waitFor(() => expect(screen.getByTestId('event-location')).toHaveTextContent('party|/e/party'));
  });

  it('shows the server error when the guest invite was rotated or is invalid', async () => {
    auth.isAuthenticated = true;
    vi.mocked(api.acceptGuestInvitation).mockRejectedValueOnce({
      response: { data: { error: 'La invitación ya no está disponible.' } },
    });

    renderInvitation('/guest-join/party?token=old-token');

    expect(await screen.findByText('La invitación ya no está disponible.')).toBeInTheDocument();
    expect(api.acceptGuestInvitation).toHaveBeenCalledExactlyOnceWith('old-token');
  });
});
