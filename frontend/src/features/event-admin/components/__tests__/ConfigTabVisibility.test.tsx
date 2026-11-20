import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/lib/api', () => ({
  api: {
    getAdminEvent: vi.fn(),
    getEventBySlug: vi.fn(),
    updateEventFeatures: vi.fn(),
    uploadEventMedia: vi.fn(),
    deleteEventMedia: vi.fn(),
    getRankingScoped: vi.fn(),
    listPostcardsScoped: vi.fn(),
    listQuestions: vi.fn(),
  },
  getPostcardStyle: (value: unknown) => (value === 'polaroid' ? 'polaroid' : 'classic'),
}));

vi.mock('@/shared/theme/useTheme', () => ({
  useTheme: () => ({
    currentTheme: {
      primaryColor: '#ec4899',
      secondaryColor: '#f9a8d4',
      accentColor: '#db2777',
      bgColor: '#fff5f7',
      textColor: '#2d1b24',
      displayFont: 'Great Vibes',
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat',
      backgroundStyle: 'light',
    },
  }),
}));

// Secciones auxiliares sin relación con la visibilidad
vi.mock('../CollaboratorsSection', () => ({ CollaboratorsSection: () => null }));
vi.mock('../GuestManagementSection', () => ({ GuestManagementSection: () => null }));
vi.mock('../DriveConnectionPanel', () => ({ DriveConnectionPanel: () => null }));
vi.mock('../BackupJobsList', () => ({ BackupJobsList: () => null }));

import { api } from '@/shared/lib/api';
import { ConfigTab } from '../ConfigTab';

const mockGetAdminEvent = vi.mocked(api.getAdminEvent);
const mockUpdateEventFeatures = vi.mocked(api.updateEventFeatures);

const baseEvent = {
  id: 'event-1',
  slug: 'ale-roy',
  name: 'Cumple de Ale',
  description: 'Una fiesta',
  owner_id: 'user-1',
  features: { quiz: true, corkboard: true, secretBox: false },
  is_active: true,
  settings: {},
};

// Estado simulado del servidor: la visibilidad almacenada
let serverIsPublic = true;

function renderConfigTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigTab slug="ale-roy" currentTab="config" />
    </QueryClientProvider>
  );
}

function visibilitySwitch() {
  return screen.getByRole('switch', { name: 'Evento privado' });
}

describe('ConfigTab — visibilidad del evento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverIsPublic = true;

    mockGetAdminEvent.mockImplementation(async () => ({
      ...baseEvent,
      is_public: serverIsPublic,
    }));
    mockUpdateEventFeatures.mockImplementation(async (_slug, _features, options) => {
      if (typeof options?.is_public === 'boolean') {
        serverIsPublic = options.is_public;
      }
      return { ...baseEvent, is_public: serverIsPublic };
    });
    vi.mocked(api.getRankingScoped).mockResolvedValue([]);
    vi.mocked(api.listPostcardsScoped).mockResolvedValue([]);
    vi.mocked(api.listQuestions).mockResolvedValue([]);
  });

  it('lee el evento por la vía administrativa para conocer la visibilidad', async () => {
    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalledWith('ale-roy'));
    expect(mockGetAdminEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.getEventBySlug)).not.toHaveBeenCalled();
  });

  it('muestra el interruptor con la visibilidad actual del evento', async () => {
    serverIsPublic = true;

    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalled());
    expect(await screen.findByText('Cumple de Ale')).toBeInTheDocument();
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Evento privado')).toBeInTheDocument();
    expect(
      screen.getByText(/propietario, los colaboradores y los invitados/i)
    ).toBeInTheDocument();
  });

  it('muestra el interruptor activo cuando el evento ya es privado', async () => {
    serverIsPublic = false;

    renderConfigTab();

    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true'));
  });

  it('permite volver el evento privado y guarda el valor', async () => {
    serverIsPublic = true;

    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalled());
    expect(await screen.findByText('Cumple de Ale')).toBeInTheDocument();
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(visibilitySwitch());
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expect(mockUpdateEventFeatures).toHaveBeenCalledWith(
      'ale-roy',
      { quiz: true, corkboard: true, secretBox: false },
      { postcard_style: 'classic', is_public: false }
    );
  });

  it('guarda la visibilidad actual cuando el administrador no toca el interruptor', async () => {
    serverIsPublic = false;

    renderConfigTab();

    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true'));

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expect(mockUpdateEventFeatures).toHaveBeenCalledWith(
      'ale-roy',
      { quiz: true, corkboard: true, secretBox: false },
      { postcard_style: 'classic', is_public: false }
    );
  });

  it('guarda un evento público sin tocar el interruptor como público', async () => {
    serverIsPublic = true;

    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalled());
    expect(await screen.findByText('Cumple de Ale')).toBeInTheDocument();
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expect(mockUpdateEventFeatures).toHaveBeenCalledWith(
      'ale-roy',
      { quiz: true, corkboard: true, secretBox: false },
      { postcard_style: 'classic', is_public: true }
    );
  });
});
