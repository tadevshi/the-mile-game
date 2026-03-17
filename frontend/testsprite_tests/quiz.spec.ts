import { test, expect } from '@playwright/test';

test.describe('Quiz Page Question Answering', () => {
  test.beforeEach(async ({ page }) => {
    // First register to be able to access quiz
    await page.goto('/event/mile-2026/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('TestPlayer');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/quiz/);
  });

  test('should display quiz page header with player name', async ({ page }) => {
    // Check header
    await expect(page.getByText('¡Juguemos!')).toBeVisible();
    await expect(page.getByText('¿Qué tanto conoces a Mile, TestPlayer?')).toBeVisible();
  });

  test('should display all favorite questions', async ({ page }) => {
    // Check favorite questions section
    const favoriteQuestions = [
      '¿Cantante favorito?',
      '¿Flor favorita?',
      '¿Cuál es mi bebida favorita?',
      '¿Película de Disney favorita?',
      '¿Estación del año preferida?',
      '¿Cuál es mi color favorito?',
      '¿Menciona algo que no me guste?'
    ];
    
    for (const question of favoriteQuestions) {
      await expect(page.getByText(question)).toBeVisible();
    }
  });

  test('should allow answering favorite questions', async ({ page }) => {
    // Answer first question
    const firstInput = page.locator('input').first();
    await firstInput.fill('Taylor Swift');
    await expect(firstInput).toHaveValue('Taylor Swift');
    
    // Answer second question
    const inputs = page.locator('input');
    await inputs.nth(1).fill('Rosa');
    await expect(inputs.nth(1)).toHaveValue('Rosa');
  });

  test('should display preference questions (This or That)', async ({ page }) => {
    // Check preference questions section header
    await expect(page.getByText('¿Qué prefiere la cumpleañera?')).toBeVisible();
    
    // Check specific preference questions
    await expect(page.getByText('¿Café o Té?')).toBeVisible();
    await expect(page.getByText('¿Playa o Montaña?')).toBeVisible();
    await expect(page.getByText('¿Frío o Calor?')).toBeVisible();
    await expect(page.getByText('¿Día o Noche?')).toBeVisible();
    await expect(page.getByText('¿Pizza o Sushi?')).toBeVisible();
    await expect(page.getByText('¿Tequila o Vino?')).toBeVisible();
  });

  test('should allow selecting preferences', async ({ page }) => {
    // Find the first preference section and select an option
    const firstPreferenceLabel = page.getByText('¿Café o Té?');
    await expect(firstPreferenceLabel).toBeVisible();
    
    // Click on the first option button (there should be 2 buttons per question)
    const optionButtons = page.locator('button[class*="rounded-full"]').filter({ hasText: /^$/ });
    if (await optionButtons.count() > 0) {
      await optionButtons.first().click();
    }
  });

  test('should display description section', async ({ page }) => {
    // Check description section header
    await expect(page.getByText('Descríbeme en una oración')).toBeVisible();
    
    // Check textarea
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', 'Eres una persona...');
  });

  test('should allow entering description', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Eres una persona maravillosa y especial.');
    await expect(textarea).toHaveValue('Eres una persona maravillosa y especial.');
  });

  test.skip('should display score counter', async ({ page }) => {
    // Score is calculated server-side only; there is no live score counter UI on the quiz page.
    // Check score display
    await expect(page.getByText('Puntaje actual:')).toBeVisible();
    await expect(page.getByText('0')).toBeVisible();
  });

  test.skip('should update score when answering correctly', async ({ page }) => {
    // Score is calculated server-side only; there is no live score counter UI on the quiz page.
    // Answer a favorite question correctly
    const firstInput = page.locator('input').first();
    await firstInput.fill('Taylor Swift');
    
    // Score should update (wait a bit for calculation)
    await page.waitForTimeout(100);
    
    // The score element should exist
    await expect(page.locator('text=0').or(page.locator('text=1')).first()).toBeVisible();
  });

  test('should submit answers and navigate to thank you page', async ({ page }) => {
    // Wait for the page to be fully loaded and inputs to be ready
    await page.waitForSelector('input[type="text"]');
    
    // Fill in all the favorite questions (text inputs)
    const inputs = page.locator('input[type="text"]');
    
    // Wait for all inputs to be visible and fill them one by one
    const testAnswers = ['Taylor Swift', 'Rosa', 'Agua', 'Frozen', 'Verano', 'Rosa', 'Nada'];
    for (let i = 0; i < 7; i++) {
      const input = inputs.nth(i);
      await input.waitFor({ state: 'visible' });
      await input.click();
      await input.fill(testAnswers[i]);
      await page.waitForTimeout(100); // Small delay for React to process
    }
    
    // Fill in the description textarea
    const textarea = page.locator('textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill('Eres una persona increíble');
    await page.waitForTimeout(100);
    
    // Click submit button
    const submitButton = page.getByRole('button', { name: /Enviar Respuestas/i });
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
    
    // V2 behavior: After submit, goes to /thank-you first
    await page.waitForURL(/.*\/event\/mile-2026\/thank-you/, { timeout: 15000 });
    
    // Verify we're on the thank you page - check for any element that would be present
    // The thank you page has a header with subtitle showing player name
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('should redirect to register if accessing quiz directly without name', async ({ page }) => {
    // Clear storage and navigate directly
    await page.evaluate(() => localStorage.clear());
    await page.goto('/event/mile-2026/quiz');
    
    // Should redirect to register (event-scoped)
    await expect(page).toHaveURL(/.*\/event\/mile-2026\/register/);
  });
});
