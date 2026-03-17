import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate from Welcome to Register page', async ({ page }) => {
    // Verify we're on the welcome page
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
    
    // Click the start button
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    
    // Verify navigation to register page (event-scoped)
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/register/);
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should navigate back from Register to Welcome', async ({ page }) => {
    // Navigate to register first
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/register/);
    
    // Click back button
    await page.getByText(/Volver al inicio/i).click();
    
    // V2 behavior: /event/:slug redirects to /event/:slug/ranking
    await expect(page).toHaveURL(/\/event\/mile-2026\/ranking/);
    await expect(page.getByRole('heading', { name: /Ranking/i })).toBeVisible();
  });
});
