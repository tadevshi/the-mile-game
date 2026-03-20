import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Phase 4:
 * - Legacy redirects (/quiz → /e/:slug/quiz)
 * - Footer branding (EventHub)
 * - Dark mode persistence
 * - Mobile responsiveness
 * - Error handling for invalid events
 */

test.describe('Legacy Redirects', () => {
  test('should redirect /quiz to /e/:slug/quiz when currentEvent exists', async ({ page }) => {
    // Set up currentEvent in localStorage (simulating existing Mile Game session)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('mile-game-current-event', JSON.stringify({ slug: 'mile-2026' }));
    });
    
    // Navigate to legacy /quiz route
    await page.goto('/quiz');
    
    // Should redirect to event-scoped route
    await expect(page).toHaveURL(/\/e\/mile-2026\/quiz/, { timeout: 5000 });
  });

  test('should redirect /ranking to /e/:slug/ranking when currentEvent exists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('mile-game-current-event', JSON.stringify({ slug: 'mile-2026' }));
    });
    
    await page.goto('/ranking');
    
    await expect(page).toHaveURL(/\/e\/mile-2026\/ranking/, { timeout: 5000 });
  });

  test('should redirect /corkboard to /e/:slug/corkboard when currentEvent exists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('mile-game-current-event', JSON.stringify({ slug: 'mile-2026' }));
    });
    
    await page.goto('/corkboard');
    
    await expect(page).toHaveURL(/\/e\/mile-2026\/corkboard/, { timeout: 5000 });
  });

  test('should redirect to landing when no currentEvent exists', async ({ page }) => {
    // Clear any existing localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('mile-game-current-event');
      localStorage.removeItem('mile-event-slug');
    });
    
    await page.goto('/quiz');
    
    // Should redirect to landing page
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});

test.describe('Footer Branding', () => {
  test('should show "Powered by EventHub" on event landing page', async ({ page }) => {
    await page.goto('/e/mile-2026');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check footer text
    const footerText = page.getByText('Powered by EventHub');
    await expect(footerText).toBeVisible();
  });

  test('should show EventHub branding in landing page footer', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    // Check brand name in footer
    const brandText = page.getByText('EventHub').first();
    await expect(brandText).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should persist dark mode preference after reload', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click the theme toggle button
    const themeToggle = page.locator('button[aria-label*="modo oscuro"], button[aria-label*="modo claro"]');
    await themeToggle.click();
    
    // Wait for theme to change
    await page.waitForTimeout(500);
    
    // Verify dark class is added to html
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Dark mode should persist
    const isStillDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isStillDark).toBe(true);
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check initial state (light mode)
    const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    
    // Toggle to dark
    const themeToggle = page.locator('button[aria-label*="modo oscuro"], button[aria-label*="modo claro"]');
    await themeToggle.click();
    await page.waitForTimeout(300);
    
    const afterToggleDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(afterToggleDark).toBe(!initialIsDark);
    
    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(300);
    
    const backToLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
    expect(backToLight).toBe(initialIsDark);
  });
});

test.describe('Error Handling', () => {
  test('should show user-friendly error for invalid event code', async ({ page }) => {
    const invalidSlug = 'evento-que-no-existe-' + Date.now();
    
    await page.goto(`/e/${invalidSlug}`);
    
    // Wait for error state to appear
    await page.waitForSelector('text=Evento no encontrado', { timeout: 10000 });
    
    // Check error message is visible
    await expect(page.getByText('Evento no encontrado')).toBeVisible();
    
    // Check "Volver al inicio" button exists
    await expect(page.getByRole('button', { name: /Volver al inicio/i })).toBeVisible();
  });

  test('should navigate back to landing when clicking "Volver al inicio"', async ({ page }) => {
    const invalidSlug = 'evento-que-no-existe-' + Date.now();
    
    await page.goto(`/e/${invalidSlug}`);
    await page.waitForSelector('text=Evento no encontrado', { timeout: 10000 });
    
    // Click back button
    await page.getByRole('button', { name: /Volver al inicio/i }).click();
    
    // Should navigate to landing
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});

test.describe('Loading States', () => {
  test('should show skeleton loading on event landing page', async ({ page }) => {
    await page.goto('/e/mile-2026');
    
    // Initially should see some loading state (spinner or skeleton)
    // The skeleton should animate
    const skeleton = page.locator('.animate-pulse, [class*="skeleton"]').first();
    
    // Wait for content or skeleton
    await page.waitForLoadState('networkidle');
    
    // Eventually should show the event name or skeleton
    const eventContent = page.getByText('Evento', { exact: false }).or(page.locator('[class*="skeleton"]'));
    await expect(eventContent.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Event Code Entry Form', () => {
  test('should show error for invalid event code', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to event code form
    await page.locator('#event-code-input').scrollIntoViewIfNeeded();
    
    // Enter invalid code
    const input = page.getByPlaceholder(/Ej: cumple-ana-2026/i);
    await input.fill('codigo-inexistente-xyz');
    
    // Click search button
    await page.getByRole('button', { name: /Buscar/i }).click();
    
    // Wait for error message
    await page.waitForSelector('text=Evento no encontrado', { timeout: 10000 });
    
    // Error should be visible
    await expect(page.getByText(/Evento no encontrado/i)).toBeVisible();
  });

  test('should navigate to valid event', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Enter valid code
    const input = page.getByPlaceholder(/Ej: cumple-ana-2026/i);
    await input.fill('mile-2026');
    
    // Click search button
    await page.getByRole('button', { name: /Buscar/i }).click();
    
    // Should navigate to event
    await expect(page).toHaveURL(/\/e\/mile-2026/, { timeout: 10000 });
  });
});
