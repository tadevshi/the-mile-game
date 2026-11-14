import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/shared/lib/api';
import type { EventGuest, InviteTokenResponse } from '@/shared/lib/api';
import type { PreviewTheme } from '@/themes';
import { GuestManagementSection } from '../GuestManagementSection';

vi.mock('@/shared/lib/api', () => ({
  api: {
    getGuestInviteToken: vi.fn(),
    rotateGuestInviteToken: vi.fn(),
    listGuests: vi.fn(),
    removeGuest: vi.fn(),
  },
}));

const mockGetGuestInviteToken = vi.mocked(api.getGuestInviteToken);
const mockRotateGuestInviteToken = vi.mocked(api.rotateGuestInviteToken);
const mockListGuests = vi.mocked(api.listGuests);
const mockRemoveGuest = vi.mocked(api.removeGuest);

const theme = {
  primaryColor: '#ec4899',
  secondaryColor: '#f9a8d4',
  textColor: '#2d1b24',
  backgroundStyle: 'light',
} as unknown as PreviewTheme;

const firstInvite: InviteTokenResponse = {
  token: 'guest-token',
  share_url: 'https://example.test/guest-join/ale-roy?token=guest-token',
};

const guest: EventGuest = {
  event_id: 'event-1',
  user_id: 'user-1',
  joined_at: '2026-11-13T00:00:00Z',
  user: { id: 'user-1', name: 'Lucía', email: 'lucia@example.test', created_at: '2026-11-01T00:00:00Z' },
};

function mockInitialData(guests: EventGuest[] = [guest]) {
  mockGetGuestInviteToken.mockResolvedValueOnce(firstInvite);
  mockListGuests.mockResolvedValueOnce(guests);
}

describe('GuestManagementSection', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('loads the guest-only link and account-linked guest list', async () => {
    mockInitialData();

    render(<GuestManagementSection slug="ale-roy" theme={theme} />);

    expect(await screen.findByText(firstInvite.share_url)).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
    expect(screen.getByText('lucia@example.test')).toBeInTheDocument();
    expect(mockGetGuestInviteToken).toHaveBeenCalledExactlyOnceWith('ale-roy');
    expect(mockListGuests).toHaveBeenCalledExactlyOnceWith('ale-roy');
  });

  it('confirms rotation and keeps accepted guests listed', async () => {
    mockInitialData();
    mockRotateGuestInviteToken.mockResolvedValueOnce({
      token: 'guest-token-2',
      share_url: 'https://example.test/guest-join/ale-roy?token=guest-token-2',
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<GuestManagementSection slug="ale-roy" theme={theme} />);
    await screen.findByText(firstInvite.share_url);
    fireEvent.click(screen.getByRole('button', { name: 'Rotar link' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Los invitados actuales conservarán su membresía'));
    expect(mockRotateGuestInviteToken).toHaveBeenCalledExactlyOnceWith('ale-roy');
    expect(await screen.findByText('https://example.test/guest-join/ale-roy?token=guest-token-2')).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('does not rotate when the organizer cancels confirmation', async () => {
    mockInitialData();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<GuestManagementSection slug="ale-roy" theme={theme} />);
    await screen.findByText(firstInvite.share_url);
    fireEvent.click(screen.getByRole('button', { name: 'Rotar link' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(mockRotateGuestInviteToken).not.toHaveBeenCalled();
    expect(screen.getByText(firstInvite.share_url)).toBeInTheDocument();
  });

  it('removes only the selected guest membership after confirmation', async () => {
    mockInitialData();
    mockRemoveGuest.mockResolvedValueOnce({ message: 'Guest removed' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<GuestManagementSection slug="ale-roy" theme={theme} />);
    await screen.findByText('Lucía');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar invitado Lucía' }));

    await waitFor(() => expect(screen.queryByText('Lucía')).not.toBeInTheDocument());
    expect(mockRemoveGuest).toHaveBeenCalledExactlyOnceWith('ale-roy', 'user-1');
  });
});
