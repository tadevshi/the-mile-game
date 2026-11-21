import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventLoader } from '../EventLoader';
import { ThemeProvider } from '@/shared/theme';
import { useEventStore } from '@/shared/store/eventStore';
import i18n from '@/shared/lib/i18n';

const apiMock = vi.hoisted(() => ({
  getEventBySlug: vi.fn(),
}));

vi.mock('@/shared/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api')>();
  return {
    ...actual,
    api: {
      getEventBySlug: apiMock.getEventBySlug,
    },
  };
});

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

function renderEventLoader(path = '/e/party/quiz') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route
            path="/e/:slug/quiz"
            element={
              <EventLoader>
                <div data-testid="event-content">Contenido del evento</div>
              </EventLoader>
            }
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('EventLoader estados de fallo', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useEventStore.setState({ currentEvent: null, isLoading: false, error: null });
    await i18n.changeLanguage('es');
  });

  it('muestra la vista de evento privado cuando la API responde 401', async () => {
    apiMock.getEventBySlug.mockRejectedValue(httpError(401));

    renderEventLoader();

    expect(await screen.findByText('Este evento es privado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByText('/guest-join/party')).toBeInTheDocument();
    expect(screen.queryByText('Ups, algo salió mal')).not.toBeInTheDocument();
  });

  it('muestra la vista de acceso denegado cuando la API responde 403', async () => {
    apiMock.getEventBySlug.mockRejectedValue(httpError(403));

    renderEventLoader();

    expect(await screen.findByText('No tenés acceso a este evento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
    expect(screen.getByText('/guest-join/party')).toBeInTheDocument();
    expect(screen.queryByText('Ups, algo salió mal')).not.toBeInTheDocument();
  });

  it('mantiene el estado de evento inexistente cuando la API responde 404', async () => {
    apiMock.getEventBySlug.mockRejectedValue(httpError(404));

    renderEventLoader();

    expect((await screen.findAllByText('Evento no encontrado')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Este evento es privado')).not.toBeInTheDocument();
    expect(screen.queryByText('No tenés acceso a este evento')).not.toBeInTheDocument();
  });

  it('mantiene el estado de evento terminado cuando la API responde 410', async () => {
    apiMock.getEventBySlug.mockRejectedValue(httpError(410));

    renderEventLoader();

    expect(await screen.findByText('Este evento ha terminado')).toBeInTheDocument();
    expect(screen.queryByText('Este evento es privado')).not.toBeInTheDocument();
    expect(screen.queryByText('No tenés acceso a este evento')).not.toBeInTheDocument();
  });

  it('mantiene el error genérico para cualquier otro estado', async () => {
    apiMock.getEventBySlug.mockRejectedValue(httpError(500));

    renderEventLoader();

    expect(await screen.findByText('Ups, algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText('Este evento es privado')).not.toBeInTheDocument();
    expect(screen.queryByText('No tenés acceso a este evento')).not.toBeInTheDocument();
  });
});
