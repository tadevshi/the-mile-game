import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('should navigate from Welcome to Register page', async ({ page }) => {
    // Verify we're on the welcome page
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
    
    // Click the start button
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    
    // Verify navigation to register page
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByText('Registro')).toBeVisible();
  });

  test('should navigate back from Register to Welcome', async ({ page }) => {
    // Navigate to register first
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    await expect(page).toHaveURL(/.*register/);
    
    // Click back button
    await page.getByText(/Volver al inicio/i).click();
    
    // Verify we're back on welcome page
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
  });
});
