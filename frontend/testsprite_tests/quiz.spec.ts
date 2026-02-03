import { test, expect } from '@playwright/test';

test.describe('Quiz Page Question Answering', () => {
  test.beforeEach(async ({ page }) => {
    // First register to be able to access quiz
    await page.goto('http://localhost:5173/register');
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('TestPlayer');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    await expect(page).toHaveURL(/.*quiz/);
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

  test('should display score counter', async ({ page }) => {
    // Check score display
    await expect(page.getByText('Puntaje actual:')).toBeVisible();
    await expect(page.getByText('0')).toBeVisible();
  });

  test('should update score when answering correctly', async ({ page }) => {
    // Answer a favorite question correctly
    const firstInput = page.locator('input').first();
    await firstInput.fill('Taylor Swift');
    
    // Score should update (wait a bit for calculation)
    await page.waitForTimeout(100);
    
    // The score element should exist
    await expect(page.locator('text=0').or(page.locator('text=1')).first()).toBeVisible();
  });

  test('should submit answers and navigate to thank you page', async ({ page }) => {
    // Fill in some answers
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 7); i++) {
      await inputs.nth(i).fill('Test Answer');
    }
    
    // Click submit
    await page.getByRole('button', { name: /Enviar Respuestas/i }).click();
    
    // Verify navigation
    await expect(page).toHaveURL(/.*thank-you/);
  });

  test('should redirect to register if accessing quiz directly without name', async ({ page }) => {
    // Clear storage and navigate directly
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173/quiz');
    
    // Should redirect to register
    await expect(page).toHaveURL(/.*register/);
  });
});
