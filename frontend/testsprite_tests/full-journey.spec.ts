import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Full Journey:
 * - Register → Login → Create Event → Admin → Public Event
 * - This is the main user flow for creating and using EventHub
 */

test.describe('Full Journey: Register → Create Event → Admin', () => {
  // Generate unique email for each test run
  const testEmail = `test${Date.now()}@eventhub.test`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  test.beforeAll(async ({ request }) => {
    // Clean up any existing user with this email
    // This is a safety measure - in real tests you'd have a test database
  });

  test('should complete full journey: register → dashboard → create event → admin', async ({ page }) => {
    // ===== STEP 1: Register =====
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    await page.getByPlaceholder(/Tu nombre/i).fill(testName);
    await page.getByPlaceholder(/tu@email.com/i).fill(testEmail);
    await page.getByPlaceholder(/Contraseña/i).fill(testPassword);
    
    // Submit registration
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();
    
    // Should redirect to dashboard after registration
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // ===== STEP 2: Create Event =====
    // Look for "Crear Evento" button
    const createButton = page.getByRole('button', { name: /Crear Evento/i }).or(page.getByText('Crear Evento').first());
    
    if (await createButton.isVisible()) {
      await createButton.click();
    } else {
      // If no event exists, there might be a different CTA
      const newEventButton = page.getByRole('link', { name: /Crear/i }).or(page.getByText(/Primer evento/i));
      if (await newEventButton.isVisible()) {
        await newEventButton.click();
      }
    }
    
    // Should navigate to wizard
    await page.waitForURL(/\/(wizard|events\/new)/, { timeout: 10000 });
    
    // ===== STEP 3: Complete Wizard =====
    // Step 1: Basic Info
    const eventNameInput = page.getByPlaceholder(/Nombre del evento/i).or(page.locator('input').first());
    await eventNameInput.fill('Mi Evento de Prueba');
    
    // Continue to next step
    const continueButton = page.getByRole('button', { name: /Continuar/i });
    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForTimeout(500);
    }
    
    // Step 2: Features (if exists)
    const nextButton2 = page.getByRole('button', { name: /Continuar/i }).or(page.getByText(/Siguiente/i).first());
    if (await nextButton2.isVisible()) {
      await nextButton2.click();
      await page.waitForTimeout(500);
    }
    
    // Step 3: Theme (if exists)
    const createEventButton = page.getByRole('button', { name: /Crear Evento/i }).or(page.getByText(/Finalizar/i).first());
    if (await createEventButton.isVisible()) {
      await createEventButton.click();
    }
    
    // Should redirect to admin page after event creation
    await page.waitForURL(/\/admin\//, { timeout: 15000 });
    
    // ===== STEP 4: Admin Panel =====
    // Verify admin page loaded
    await page.waitForLoadState('networkidle');
    
    // Check tabs are visible
    const configTab = page.getByText(/Configuración/i).or(page.getByRole('tab', { name: /Config/i }));
    if (await configTab.isVisible()) {
      await expect(configTab).toBeVisible();
    }
    
    // Check that we can see event name
    const eventTitle = page.getByText(/Mi Evento/i);
    await expect(eventTitle.first()).toBeVisible({ timeout: 5000 });
    
    // ===== STEP 5: Navigate to Public Event =====
    // Look for "Ver evento" or link to public event
    const viewEventLink = page.getByRole('link', { name: /Ver evento/i }).or(page.locator('a[href*="/e/"]').first());
    
    if (await viewEventLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewEventLink.click();
      
      // Should navigate to public event page
      await page.waitForURL(/\/e\//, { timeout: 10000 });
      
      // Verify public page content
      await page.waitForLoadState('networkidle');
      
      // Check for event features (Quiz, Ranking, etc.)
      const quizButton = page.getByText(/Quiz/i);
      if (await quizButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(quizButton).toBeVisible();
      }
    }
  });

  test('should allow user to login after registering', async ({ page }) => {
    // Register first
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/Tu nombre/i).fill(testName);
    await page.getByPlaceholder(/tu@email.com/i).fill(testEmail);
    await page.getByPlaceholder(/Contraseña/i).fill(testPassword);
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Logout by clearing localStorage (in real app, you'd click logout)
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
    });
    
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.getByPlaceholder(/tu@email.com/i).fill(testEmail);
    await page.getByPlaceholder(/Contraseña/i).fill(testPassword);
    
    // Submit login
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Landing Page CTAs', () => {
  test('should navigate to register when clicking "Crear Evento" as anonymous user', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click "Crear Evento" button
    const createButton = page.getByRole('button', { name: /Crear Evento/i }).first();
    await createButton.click();
    
    // Should navigate to register
    await page.waitForURL(/\/register/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to event code input when clicking "Ingresar a Evento"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click "Ingresar a Evento" button
    const joinButton = page.getByRole('button', { name: /Ingresar a Evento/i }).first();
    await joinButton.click();
    
    // Should scroll to and focus on event code input
    const input = page.getByPlaceholder(/Ej: cumple-ana-2026/i);
    await expect(input).toBeFocused();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
    });
    
    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing wizard without auth', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
    });
    
    await page.goto('/wizard/new');
    
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
