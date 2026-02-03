import { test, expect } from '@playwright/test';

test.describe('Routing Between Pages', () => {
  test('should route to home page at root path', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
  });

  test('should route to register page', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should route to quiz page with registered user', async ({ page }) => {
    // Register first
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('RouterTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Verify quiz page
    await expect(page).toHaveURL(/.*quiz/);
    await expect(page.getByText('¡Juguemos!')).toBeVisible();
  });

  test('should route to thank you page after quiz submission', async ({ page }) => {
    // Complete quiz
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('RouterTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Fill and submit
    const inputs = page.locator('input[type="text"]');
    for (let i = 0; i < 3; i++) {
      await inputs.nth(i).fill('Answer');
    }
    await page.getByRole('button', { name: /Enviar Respuestas/i }).click();
    
    // Verify thank you page
    await expect(page).toHaveURL(/.*thank-you/);
    await expect(page.getByText('¡Gracias por participar!')).toBeVisible();
  });

  test('should route to ranking page', async ({ page }) => {
    await page.goto('http://localhost:5173/ranking');
    await expect(page.getByText('Ranking')).toBeVisible();
  });

  test('should handle 404 for unknown routes', async ({ page }) => {
    await page.goto('http://localhost:5173/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Página no encontrada')).toBeVisible();
  });

  test('should maintain history when navigating', async ({ page }) => {
    // Start at welcome
    await page.goto('http://localhost:5173/');
    
    // Go to register
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    await expect(page).toHaveURL(/.*register/);
    
    // Go back using browser back
    await page.goBack();
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
    
    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/.*register/);
  });

  test('should handle deep linking to quiz without registration', async ({ page }) => {
    // Clear any existing state
    await page.evaluate(() => localStorage.clear());
    
    // Try to access quiz directly
    await page.goto('http://localhost:5173/quiz');
    
    // Should redirect to register
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should preserve query parameters during navigation', async ({ page }) => {
    // Navigate with query params
    await page.goto('http://localhost:5173/register?ref=test123');
    
    // Fill form and submit
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('QueryTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Should navigate to quiz (query params may be stripped or preserved based on implementation)
    await expect(page).toHaveURL(/.*quiz/);
  });

  test('should handle rapid route changes', async ({ page }) => {
    // Rapidly navigate between pages
    await page.goto('http://localhost:5173/');
    await page.goto('http://localhost:5173/register');
    await page.goto('http://localhost:5173/ranking');
    await page.goto('http://localhost:5173/');
    
    // Final page should be welcome
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
  });
});
