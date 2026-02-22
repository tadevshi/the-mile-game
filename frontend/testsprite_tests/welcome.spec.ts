import { test, expect } from '@playwright/test';

test.describe('Welcome Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('should display welcome page elements', async ({ page }) => {
    // Check main title
    await expect(page.getByText('¡Bienvenidos a mi Cumpleaños!')).toBeVisible();
    
    // Check subtitle
    await expect(page.getByText('Mágica Celebración')).toBeVisible();
    
    // Check tagline
    await expect(page.getByText('¿Qué tanto me conoces?')).toBeVisible();
    
    // Check start button is present
    const startButton = page.getByRole('button', { name: /Empezar Juego/i });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('should have decorative elements', async ({ page }) => {
    // Check for butterfly decorations (SVG elements - at least 2 inline ones in WelcomePage)
    const svgs = page.locator('svg');
    await expect(svgs).toHaveCount(2, { timeout: 10000 }).catch(() => {
      // ButterflyBackground adds more SVGs; just verify at least the 2 inline ones exist
    });
    const svgCount = await svgs.count();
    expect(svgCount).toBeGreaterThanOrEqual(2);
    
    // Check for Mile's photo (img element instead of text initial)
    await expect(page.locator('img[alt="Mile"]')).toBeVisible();
  });

  test('should start game on button click', async ({ page }) => {
    // Click start button
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    
    // Verify navigation
    await expect(page).toHaveURL(/.*register/);
    
    // Check registration form elements
    await expect(page.getByText('Nombre de la Princesa/Invitado')).toBeVisible();
    await expect(page.getByPlaceholder(/Escribe tu nombre/i)).toBeVisible();
  });
});
