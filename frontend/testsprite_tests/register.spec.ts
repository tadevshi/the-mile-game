import { test, expect } from '@playwright/test';

test.describe('Register Page Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/register');
  });

  test('should display register form elements', async ({ page }) => {
    // Check header
    await expect(page.getByText('Registro')).toBeVisible();
    await expect(page.getByText('¿Quién juega hoy?')).toBeVisible();
    
    // Check avatar decoration
    await expect(page.getByText('👑')).toBeVisible();
    
    // Check input field
    const nameInput = page.getByPlaceholder(/Escribe tu nombre/i);
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEnabled();
    
    // Check start button
    await expect(page.getByRole('button', { name: /¡Listos para jugar!/i })).toBeVisible();
  });

  test('should show error for empty name submission', async ({ page }) => {
    // Try to submit without entering name
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Check error message
    await expect(page.getByText('Por favor ingresa tu nombre')).toBeVisible();
    
    // Verify we stayed on register page
    await expect(page).toHaveURL(/.*register/);
  });

  test('should show error for whitespace-only name', async ({ page }) => {
    // Enter only whitespace
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('   ');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Check error message
    await expect(page.getByText('Por favor ingresa tu nombre')).toBeVisible();
  });

  test('should accept valid name and navigate to quiz', async ({ page }) => {
    // Enter valid name
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('María');
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Verify navigation to quiz page
    await expect(page).toHaveURL(/.*quiz/);
    await expect(page.getByText('¡Juguemos!')).toBeVisible();
  });

  test('should accept long names', async ({ page }) => {
    // Enter a long name
    const longName = 'María de las Mercedes de la Concepción';
    await page.getByPlaceholder(/Escribe tu nombre/i).fill(longName);
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    
    // Verify navigation
    await expect(page).toHaveURL(/.*quiz/);
  });

  test('should clear error when user starts typing', async ({ page }) => {
    // Trigger error first
    await page.getByRole('button', { name: /¡Listos para jugar!/i }).click();
    await expect(page.getByText('Por favor ingresa tu nombre')).toBeVisible();
    
    // Type something
    await page.getByPlaceholder(/Escribe tu nombre/i).fill('A');
    
    // Error should disappear
    await expect(page.getByText('Por favor ingresa tu nombre')).not.toBeVisible();
  });
});
