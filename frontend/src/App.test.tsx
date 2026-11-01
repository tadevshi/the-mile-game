import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useLocation, useParams } from 'react-router-dom';
import App from './App';

const auth = vi.hoisted(() => ({ isAuthenticated: true, isLoading: false }));
vi.mock('@/features/auth/store/authStore', () => ({ useAuthStore: () => auth }));

function Page({ name }: { name: string }) {
  const location = useLocation();
  const { slug } = useParams();
  return <div data-testid="page">{name}|{slug}|{location.pathname}{location.search}{location.hash}|{location.state?.from?.pathname}</div>;
}
function Wrap({ children }: { children: ReactNode }) { return <>{children}</>; }
vi.mock('framer-motion', () => ({ AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> } }));
vi.mock('@/shared/theme', () => ({ ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/shared', async () => {
  const { ProtectedRoute } = await import('@/shared/components/ProtectedRoute');
  return {
    ProtectedRoute,
    ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
    EventLoader: ({ children }: { children: ReactNode }) => <div data-testid="event-loader">{children}</div>,
    EventLayout: ({ children }: { children: ReactNode }) => <div data-testid="event-layout">{children}</div>,
    useFeatureEnabled: () => true,
  };
});
vi.mock('@features/quiz', () => ({ RegisterPage: () => <Page name="register" />, QuizPage: () => <Page name="quiz" />, ThankYouPage: () => <Page name="thanks" /> }));
vi.mock('@features/ranking', () => ({ RankingPage: () => <Page name="ranking" /> }));
vi.mock('@features/postcards', () => ({ CorkboardPage: () => <Page name="corkboard" />, SecretBoxPage: () => <Page name="secret-box" /> }));
vi.mock('@/features/auth', () => ({ LoginPage: () => <Page name="login" />, RegisterPage: Wrap, ForgotPasswordPage: Wrap, ResetPasswordPage: Wrap }));
vi.mock('@/features/dashboard', () => ({ DashboardPage: () => <Page name="dashboard" />, CreateEventPage: () => <Page name="create" /> }));
vi.mock('@/features/landing', () => ({ LandingPage: () => <Page name="landing" /> }));
vi.mock('@/features/event-wizard', () => ({ EventWizardPage: () => <Page name="wizard" /> }));
vi.mock('@/features/event-admin', () => ({ EventAdminPage: () => <Page name="admin" /> }));
vi.mock('@/features/event-public', () => ({ EventLandingPage: () => <Page name="event" /> }));
vi.mock('@/features/event-admin/pages/QuestionEditorPage', () => ({ QuestionEditorPage: () => <Page name="questions" /> }));
vi.mock('@/features/event-admin/pages/ThemeEditorPage', () => ({ ThemeEditorPage: () => <Page name="theme" /> }));
vi.mock('@/features/collaborators/pages/AcceptInvitationPage', () => ({ AcceptInvitationPage: Wrap }));
vi.mock('@/shared/components/ThemeToggle', () => ({ ThemeToggle: () => <div data-testid="theme-toggle" /> }));
vi.mock('@/shared/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/shared/components/MobileMenu', () => ({ MobileMenu: () => null }));
vi.mock('@/shared/components/InstallPromptBanner', () => ({ InstallPromptBanner: () => null }));

beforeEach(() => { localStorage.clear(); auth.isAuthenticated = true; });
function visit(path: string) {
  window.history.replaceState({}, '', path);
  render(<App />);
}

describe('admin route compatibility', () => {
  it.each([
    ['/admin?source=old#top', '/dashboard?source=old#top', 'dashboard'],
    ['/admin/party?tab=corkboard#preview', '/e/party/admin?tab=corkboard#preview', 'admin'],
    ['/admin/party/questions?source=old#edit', '/e/party/admin/questions?source=old#edit', 'questions'],
    ['/admin/party/theme?source=old#colors', '/e/party/admin/theme?source=old#colors', 'theme'],
    ['/admin/party/unknown/deep?tab=stats#totals', '/e/party/admin?tab=stats#totals', 'admin'],
    ['/admin/party/questions/', '/e/party/admin/questions', 'questions'],
  ])('redirects %s to %s', async (oldPath, target, name) => {
    visit(oldPath);
    await waitFor(() => expect(window.location.pathname + window.location.search + window.location.hash).toBe(target));
    expect(screen.getByTestId('page')).toHaveTextContent(name);
    expect(screen.queryByTestId('event-loader')).not.toBeInTheDocument();
  });

  it.each([['', 'admin'], ['/questions', 'questions'], ['/theme', 'theme']])('renders protected canonical %s', (suffix, name) => {
    visit(`/e/party/admin${suffix}?tab=theme#preview`);
    expect(screen.getByTestId('page')).toHaveTextContent(`${name}|party|/e/party/admin${suffix}?tab=theme#preview`);
    expect(screen.queryByTestId('event-loader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-layout')).not.toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it.each(['/e/party/admin', '/e/party/admin/questions', '/e/party/admin/theme', '/admin/party', '/admin/party/questions', '/admin/party/theme', '/admin'])('guards %s without auth', async (path) => {
    auth.isAuthenticated = false;
    visit(path);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByTestId('page')).toHaveTextContent(`login||/login|${path === '/admin' ? '/dashboard' : path.replace('/admin/party', '/e/party/admin')}`);
  });
});

describe('existing route callers', () => {
  it.each(['quiz', 'ranking', 'corkboard', 'secret-box', 'register', 'thank-you'])('keeps public %s event wrappers without auth', (suffix) => {
    auth.isAuthenticated = false;
    visit(`/e/party/${suffix}`);
    expect(window.location.pathname).toBe(`/e/party/${suffix}`);
    expect(screen.getByTestId('event-loader')).toBeInTheDocument();
    expect(screen.getByTestId('event-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('page')).toHaveTextContent(`|party|/e/party/${suffix}`);
  });
  it('keeps public landing outside EventLayout', () => {
    auth.isAuthenticated = false;
    visit('/e/party');
    expect(screen.getByTestId('page')).toHaveTextContent('event|party|/e/party');
    expect(screen.getByTestId('event-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('event-layout')).not.toBeInTheDocument();
  });
  it.each(['/dashboard', '/wizard/new', '/events/new'])('retains authentication on %s', async (path) => {
    auth.isAuthenticated = false;
    visit(path);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByTestId('page')).toHaveTextContent(`login||/login|${path}`);
  });
});
