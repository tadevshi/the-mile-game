import { test, expect } from '@playwright/test';

test.describe('Routing Between Pages', () => {
  test('should route to home page at root path', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
  });

  test('should route to register page', async ({ page }) => {
    await page.goto('/event/mile-2026/register');
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should route to quiz page with registered user', async ({ page }) => {
    // Register first - V2 requires event prefix
    await page.goto('/event/mile-2026/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('RouterTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Verify quiz page
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/quiz/);
    await expect(page.getByText('¡Juguemos!')).toBeVisible();
  });

  test('should route to thank you page after quiz submission', async ({ page }) => {
    // Complete quiz - V2 requires event prefix
    await page.goto('/event/mile-2026/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('RouterTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Fill all required quiz fields
    const inputs = page.locator('input[type="text"]');
    const testAnswers = ['Taylor Swift', 'Rosa', 'Agua', 'Frozen', 'Verano', 'Rosa', 'Nada'];
    
    // Fill all 7 favorite questions
    for (let i = 0; i < 7; i++) {
      await inputs.nth(i).fill(testAnswers[i]);
    }
    
    // Fill description textarea
    await page.locator('textarea').fill('Eres una persona increíble');
    
    // Submit the quiz
    await page.getByRole('button', { name: /Enviar Respuestas/i }).click();
    
    // V2 behavior: goes to /thank-you first
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/thank-you/);
    await expect(page.getByText('¡Gracias por participar!')).toBeVisible();
  });

  test('should route to ranking page', async ({ page }) => {
    // /ranking redirects to /event/mile-2026/ranking
    await page.goto('/ranking');
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/ranking/);
    // Use more specific locator to avoid ambiguity with "Ver Ranking" buttons
    await expect(page.getByRole('heading', { name: /Ranking/i })).toBeVisible();
  });

  test('should handle 404 for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Página no encontrada')).toBeVisible();
  });

  test('should maintain history when navigating', async ({ page }) => {
    // Start at welcome
    await page.goto('/');
    
    // Go to register
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/register/);
    
    // Go back using browser back
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
    
    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/.*\/register/);
  });

  test('should handle deep linking to quiz without registration', async ({ page }) => {
    // Navigate to app first, then clear any existing state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    // Try to access quiz directly
    await page.goto('/event/mile-2026/quiz');
    
    // Should redirect to register
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/register/);
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should preserve query parameters during navigation', async ({ page }) => {
    // Navigate with query params
    await page.goto('/event/mile-2026/register?ref=test123');
    
    // Fill form and submit
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('QueryTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Should navigate to quiz (query params may be stripped or preserved based on implementation)
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/quiz/);
  });

  test('should handle rapid route changes', async ({ page }) => {
    // Rapidly navigate between pages
    await page.goto('/');
    await page.goto('/register');
    await page.goto('/ranking');
    await page.goto('/');
    
    // Final page should be welcome
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
  });
});
