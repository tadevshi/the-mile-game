import { test, expect, type Page } from '@playwright/test';

const event = {
  id: 'route-test-event', slug: 'route-party', name: 'Route Test Party', owner_id: 'route-owner',
  description: 'Isolated routing fixture', features: { quiz: true, corkboard: true, secretBox: true },
  settings: {},
};

async function mockApp(page: Page, authenticated = true) {
  await page.addInitScript((authenticated) => {
    localStorage.clear();
    if (authenticated) {
      localStorage.setItem('auth-token', 'isolated-route-test');
      localStorage.setItem('auth-user', JSON.stringify({ id: 'route-owner', name: 'Route Owner' }));
    }
  }, authenticated);
  // Never allow a test to contact a real API, WebSocket, or external resource.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.replace('/api', '');
      let data: unknown;
      if (path === '/events/route-party') data = event;
      else if (path === '/users/me/events') data = [event];
      else if (path.endsWith('/secret-box/token')) data = { token: 'fixture-token', url: '/e/route-party/secret-box?token=fixture-token' };
      else if (path.endsWith('/secret-box')) data = { postcards: [], total: 0, revealed: false };
      else if (path === '/themes/presets') data = { presets: [] };
      else if (path.endsWith('/theme')) data = {};
      else if (path.includes('/analytics')) data = {};
      else if (path.endsWith('/collaborators/invite')) data = { token: 'fixture-invite' };
      else if (/\/(ranking|postcards|questions|collaborators)$/.test(path)) data = [];
      else return route.fulfill({ status: 501, json: { error: `Unmocked route: ${path}` } });
      return route.fulfill({ json: data });
    }
    if (url.origin !== 'http://localhost:5173') return route.abort();
    return route.continue();
  });
  await page.routeWebSocket(/.*/, (socket) => socket.close());
}

test.beforeEach(async ({ page }) => { await mockApp(page); });

test('legacy roots and unknown suffixes resolve with query and hash intact', async ({ page }) => {
  for (const [source, target] of [
    ['/admin?source=old#top', '/dashboard?source=old#top'],
    ['/admin/route-party?tab=stats#totals', '/e/route-party/admin?tab=stats#totals'],
    ['/admin/route-party/unknown/deep?tab=theme#colors', '/e/route-party/admin?tab=theme#colors'],
  ]) {
    await page.goto(source);
    await expect(page).toHaveURL(`http://localhost:5173${target}`);
    await expect(page.getByText('Página no encontrada', { exact: true })).toHaveCount(0);
  }
});

test('all canonical tabs render their existing functionality', async ({ page }) => {
  await page.goto('/admin/route-party?tab=questions');
  await expect(page).toHaveURL(/\/e\/route-party\/admin\?tab=questions$/);
  await expect(page.getByRole('heading', { name: 'Preguntas del Quiz' })).toBeVisible();
  for (const [label, tab, heading] of [
    ['Config', 'config', 'Configuración General'],
    ['Tema', 'theme', 'Tema Visual'],
    ['Corkboard', 'corkboard', 'Corkboard & Secret Box'],
    ['Stats', 'stats', 'Estadísticas'],
    ['Analytics', 'analytics', 'Analytics'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/e/route-party/admin\\?tab=${tab}$`));
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    if (tab === 'config') {
      await expect(page.getByText('Logo del Evento', { exact: true })).toBeVisible();
      await expect(page.getByText('http://localhost:5173/e/route-party/admin', { exact: true })).toBeVisible();
    }
    if (tab === 'corkboard') {
      await expect(page.getByRole('heading', { name: 'Gestión de Secret Box' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Resetear Secret Box' })).toBeVisible();
    }
  }
});

test('legacy editors and canonical tab links open full editors', async ({ page }) => {
  await page.goto('/admin/route-party/questions?source=old#edit');
  await expect(page).toHaveURL('http://localhost:5173/e/route-party/admin/questions?source=old#edit');
  await expect(page.getByRole('heading', { name: 'Editor de Preguntas' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Importar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible();
  await page.goto('/admin/route-party/theme?source=old#colors');
  await expect(page).toHaveURL('http://localhost:5173/e/route-party/admin/theme?source=old#colors');
  await expect(page.getByRole('heading', { name: 'Customize Theme' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Typography' })).toBeVisible();
  await page.goto('/e/route-party/admin?tab=questions');
  await page.getByRole('link', { name: 'Gestionar Preguntas' }).click();
  await expect(page.getByRole('heading', { name: 'Editor de Preguntas' })).toBeVisible();
  await page.goto('/e/route-party/admin?tab=theme');
  await page.getByRole('link', { name: 'Personalizar Tema' }).click();
  await expect(page.getByRole('heading', { name: 'Customize Theme' })).toBeVisible();
});

test('anonymous legacy and canonical admin URLs use the auth guard', async ({ page }) => {
  // Override the authenticated init script before the next document starts.
  await page.addInitScript(() => localStorage.clear());
  for (const path of ['/admin', '/admin/route-party/theme', '/e/route-party/admin', '/e/route-party/admin/questions']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Panel de administración', { exact: true })).toHaveCount(0);
  }
});
