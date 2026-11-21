import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { PrivateEventView } from '../PrivateEventView';
import { ThemeProvider } from '@/shared/theme';
import i18n from '@/shared/lib/i18n';
import esTranslations from '../../../../../public/locales/es/translation.json';
import enTranslations from '../../../../../public/locales/en/translation.json';

function LoginProbe() {
  const [searchParams] = useSearchParams();
  return (
    <div data-testid="login-probe">
      <span data-testid="login-return-to">{searchParams.get('return_to')}</span>
      <span data-testid="login-raw-search">{searchParams.toString()}</span>
    </div>
  );
}

function renderView(
  kind: 'private' | 'denied',
  path = '/e/party/quiz',
  options: { eventName?: string; slug?: string } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route
            path="/e/:slug/quiz"
            element={
              <PrivateEventView
                kind={kind}
                slug={options.slug ?? 'party'}
                eventName={options.eventName}
              />
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('PrivateEventView', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('muestra el aviso de evento privado y la pista de invitación', () => {
    renderView('private');

    expect(screen.getByText('Este evento es privado')).toBeInTheDocument();
    expect(screen.getByText('/guest-join/party')).toBeInTheDocument();
    expect(screen.getByText(/pedile al organizador/i)).toBeInTheDocument();
  });

  it('lleva al login conservando el destino actual', async () => {
    renderView('private', '/e/party/quiz?tab=2');

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    const probe = await screen.findByTestId('login-probe');
    expect(probe).toHaveTextContent('/e/party/quiz?tab=2');
    expect(screen.getByTestId('login-raw-search')).toHaveTextContent(
      'return_to=%2Fe%2Fparty%2Fquiz%3Ftab%3D2',
    );
  });

  it('muestra el nombre del evento cuando se conoce', () => {
    renderView('private', '/e/party/quiz', { eventName: 'Cumple de Ana' });

    expect(screen.getByText('Cumple de Ana')).toBeInTheDocument();
  });

  it('la vista de acceso denegado no ofrece iniciar sesión', () => {
    renderView('denied');

    expect(screen.getByText('No tenés acceso a este evento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
    expect(screen.getByText('/guest-join/party')).toBeInTheDocument();
    expect(screen.getByText(/pedile al organizador/i)).toBeInTheDocument();
  });

  it('usa las traducciones en inglés', async () => {
    await i18n.changeLanguage('en');
    renderView('private');

    expect(screen.getByText('This event is private')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('tiene las mismas claves en español y en inglés, con textos distintos', () => {
    const es = esTranslations.privateEvent;
    const en = enTranslations.privateEvent;

    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(es).length).toBeGreaterThan(0);

    for (const key of Object.keys(es)) {
      expect(en[key as keyof typeof en]).toBeTruthy();
      expect(es[key as keyof typeof es]).not.toBe(en[key as keyof typeof en]);
    }
  });
});
