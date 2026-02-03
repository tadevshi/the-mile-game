import { test, expect } from '@playwright/test';

test.describe('Zustand State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
  });

  test('should persist player name in store', async ({ page }) => {
    // Navigate to register and enter name
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('PersistentPlayer');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Navigate to quiz and verify name is displayed
    await expect(page).toHaveURL(/.*quiz/);
    await expect(page.getByText('¿Qué tanto conoces a Mile, PersistentPlayer?')).toBeVisible();
    
    // Reload page and verify name persists
    await page.reload();
    await expect(page.getByText('¿Qué tanto conoces a Mile, PersistentPlayer?')).toBeVisible();
  });

  test('should persist quiz answers across page reloads', async ({ page }) => {
    // Go through registration
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('AnswerTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Answer a question
    const firstInput = page.locator('input').first();
    await firstInput.fill('Saved Answer');
    
    // Reload the page
    await page.reload();
    
    // Verify answer is still there
    await expect(firstInput).toHaveValue('Saved Answer');
  });

  test('should persist score across page reloads', async ({ page }) => {
    // Go through registration and answer correctly
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('ScoreTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Answer with correct value
    const firstInput = page.locator('input').first();
    await firstInput.fill('Taylor Swift');
    
    // Wait for score calculation
    await page.waitForTimeout(200);
    
    // Reload
    await page.reload();
    await page.waitForTimeout(200);
    
    // Score should persist (check if score element contains a number)
    const scoreElement = page.locator('div[class*="bg-primary/20"]').first();
    await expect(scoreElement).toBeVisible();
  });

  test('should reset quiz state when starting new game', async ({ page }) => {
    // Complete a quiz first
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('ResetTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Answer questions
    const inputs = page.locator('input[type="text"]');
    for (let i = 0; i < 3; i++) {
      await inputs.nth(i).fill('Answer');
    }
    
    // Go back to welcome
    await page.goto('http://localhost:5173/');
    
    // Start new game
    await page.getByRole('button', { name: /Empezar Juego/i }).click();
    
    // Enter new name
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('NewPlayer');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Check that quiz starts fresh
    await expect(page.getByText('¿Qué tanto conoces a Mile, NewPlayer?')).toBeVisible();
  });

  test('should clear localStorage on manual clear', async ({ page }) => {
    // Set up some data
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('ClearTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Clear storage
    await page.evaluate(() => localStorage.clear());
    
    // Reload and should be redirected to register
    await page.goto('http://localhost:5173/quiz');
    await expect(page).toHaveURL(/.*register/);
  });

  test('should handle concurrent store updates', async ({ page }) => {
    // Go to quiz
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('ConcurrentTester');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Answer multiple questions quickly
    const inputs = page.locator('input[type="text"]');
    await Promise.all([
      inputs.nth(0).fill('Answer1'),
      inputs.nth(1).fill('Answer2'),
      inputs.nth(2).fill('Answer3'),
    ]);
    
    // Verify all answers are saved
    await expect(inputs.nth(0)).toHaveValue('Answer1');
    await expect(inputs.nth(1)).toHaveValue('Answer2');
    await expect(inputs.nth(2)).toHaveValue('Answer3');
  });
});
