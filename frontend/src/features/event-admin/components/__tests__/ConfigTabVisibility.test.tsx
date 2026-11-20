import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
import type { AdminEvent } from '@/shared/lib/api';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderConfigTab(slug = 'ale-roy') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ConfigTab slug={slug} currentTab="config" />
    </QueryClientProvider>
  );

  return {
    ...utils,
    rerenderWithSlug: (nextSlug: string) =>
      utils.rerender(
        <QueryClientProvider client={queryClient}>
          <ConfigTab slug={nextSlug} currentTab="config" />
        </QueryClientProvider>
      ),
  };
}

function visibilitySwitch() {
  return screen.getByRole('switch', { name: 'Evento privado' });
}

function saveButton() {
  return screen.getByRole('button', { name: /Guardar Cambios/i });
}

// La visibilidad no debe viajar en el guardado cuando el administrador no
// movió el interruptor: el backend conserva la almacenada.
function expectVisibilityNotSent() {
  const options = mockUpdateEventFeatures.mock.calls[0]?.[2];
  expect(options?.is_public).toBeUndefined();
  expect(options && 'is_public' in options).toBe(false);
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
    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));
    expect(visibilitySwitch()).not.toBeDisabled();
    expect(screen.getByText('Evento privado')).toBeInTheDocument();
    expect(
      screen.getByText(/propietario, los colaboradores y los invitados/i)
    ).toBeInTheDocument();
  });

  it('muestra el interruptor activo cuando el evento ya es privado', async () => {
    serverIsPublic = false;

    renderConfigTab();

    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true'));
    expect(visibilitySwitch()).not.toBeDisabled();
  });

  it('permite volver el evento privado y guarda el valor', async () => {
    serverIsPublic = true;

    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalled());
    expect(await screen.findByText('Cumple de Ale')).toBeInTheDocument();
    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(visibilitySwitch());
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expect(mockUpdateEventFeatures).toHaveBeenCalledWith(
      'ale-roy',
      { quiz: true, corkboard: true, secretBox: false },
      { postcard_style: 'classic', is_public: false }
    );
    expect(serverIsPublic).toBe(false);
  });

  it('no informa la visibilidad cuando el administrador no toca el interruptor', async () => {
    // El evento es privado y el administrador solo cambia otra cosa: el
    // guardado no debe llevar la visibilidad, para que el backend conserve la
    // almacenada y no se re-publique el evento.
    serverIsPublic = false;

    renderConfigTab();

    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true'));

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expectVisibilityNotSent();
    expect(serverIsPublic).toBe(false);
  });

  it('no informa la visibilidad de un evento público que el administrador no toca', async () => {
    serverIsPublic = true;

    renderConfigTab();

    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalled());
    expect(await screen.findByText('Cumple de Ale')).toBeInTheDocument();
    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expectVisibilityNotSent();
    expect(serverIsPublic).toBe(true);
  });

  it('una respuesta tardía no pisa el valor que el panel escribió', async () => {
    // La primera lectura dice "público"; la lectura que llega después de la
    // escritura trae un valor que no es el que el panel escribió.
    const lateRead = deferred<AdminEvent>();
    mockGetAdminEvent.mockImplementationOnce(async () => ({
      ...baseEvent,
      is_public: true,
    }));
    mockGetAdminEvent.mockImplementationOnce(() => lateRead.promise);
    mockUpdateEventFeatures.mockImplementation(async () => ({
      ...baseEvent,
      is_public: true,
    }));

    renderConfigTab();

    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));

    // El administrador mueve el interruptor y vuelve a su posición: la
    // decisión final es "público".
    fireEvent.click(visibilitySwitch());
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(visibilitySwitch());
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expect(mockUpdateEventFeatures).toHaveBeenCalledWith(
      'ale-roy',
      { quiz: true, corkboard: true, secretBox: false },
      { postcard_style: 'classic', is_public: true }
    );

    // La lectura posterior a la escritura llega con "privado".
    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalledTimes(2));
    await act(async () => {
      lateRead.resolve({ ...baseEvent, name: 'Cumple de Ale (tarde)', is_public: false });
      await Promise.resolve();
    });

    // El panel sigue mostrando lo que escribió: la respuesta tardía no decide.
    expect(await screen.findByText('Cumple de Ale (tarde)')).toBeInTheDocument();
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('no afirma un valor de visibilidad hasta que resuelve la lectura administrativa', async () => {
    const pending = deferred<AdminEvent>();
    mockGetAdminEvent.mockReturnValue(pending.promise);

    renderConfigTab();

    // Mientras no se conoce la visibilidad, el interruptor no afirma nada
    // sobre el evento.
    const switchElement = visibilitySwitch();
    expect(switchElement).toBeDisabled();
    expect(switchElement).not.toHaveAttribute('aria-checked');

    // Y el guardado en esa ventana no informa la visibilidad.
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expectVisibilityNotSent();
  });

  it('reinicia el estado de visibilidad cuando cambia el slug de la ruta', async () => {
    const secondEvent = deferred<AdminEvent>();
    mockGetAdminEvent.mockImplementation(async (slug) => {
      if (slug === 'ale-roy') {
        return { ...baseEvent, slug, is_public: true };
      }
      return secondEvent.promise;
    });

    const { rerenderWithSlug } = renderConfigTab('ale-roy');
    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));

    // El administrador mueve el interruptor del primer evento.
    fireEvent.click(visibilitySwitch());
    expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'true');

    rerenderWithSlug('otro-evento');

    // El estado se reinicia: la visibilidad del evento anterior no se arrastra
    // ni se afirma antes de la lectura del nuevo evento.
    await waitFor(() => expect(mockGetAdminEvent).toHaveBeenCalledWith('otro-evento'));
    expect(visibilitySwitch()).toBeDisabled();
    expect(visibilitySwitch()).not.toHaveAttribute('aria-checked');

    // El guardado tampoco lleva la visibilidad del evento anterior.
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockUpdateEventFeatures).toHaveBeenCalledTimes(1));
    expectVisibilityNotSent();

    // Con la lectura del nuevo evento, el panel muestra su visibilidad.
    await act(async () => {
      secondEvent.resolve({ ...baseEvent, slug: 'otro-evento', name: 'Otro evento', is_public: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('Otro evento')).toBeInTheDocument());
    await waitFor(() => expect(visibilitySwitch()).toHaveAttribute('aria-checked', 'false'));
    expect(visibilitySwitch()).not.toBeDisabled();
  });
});
