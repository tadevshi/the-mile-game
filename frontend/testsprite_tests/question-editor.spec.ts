import { test, expect, type Page } from '@playwright/test';

const TEST_EVENT_SLUG = 'mile-2026';
const TEST_ADMIN_KEY = 'test-admin-key';

test.describe('Question Editor E2E Tests', () => {
  // Helper to navigate to the question editor
  async function navigateToQuestionEditor(page: Page) {
    await page.goto(`/admin/questions/${TEST_EVENT_SLUG}?key=${TEST_ADMIN_KEY}`);
  }

  // Helper to fill in the question form
  async function fillQuestionForm(
    page: Page,
    options: {
      key?: string;
      question?: string;
      type?: 'text' | 'choice' | 'boolean';
      section?: string;
      correctAnswers?: string[];
      options?: string[];
      isScorable?: boolean;
    } = {}
  ) {
    const {
      key = 'test_question_' + Date.now(),
      question = 'Test question text',
      type = 'text',
      section = 'favorites',
      correctAnswers = ['answer1'],
      options: formOptions = [],
      isScorable = true,
    } = options;

    if (key) {
      await page.fill('[data-testid="question-key-input"]', key);
    }
    if (question) {
      await page.fill('[data-testid="question-text-input"]', question);
    }
    if (section) {
      await page.selectOption('select[name="section"]', section);
    }
    if (type === 'choice' && formOptions.length > 0) {
      for (let i = 0; i < formOptions.length; i++) {
        await page.fill(`input[name="options[${i}]"]`, formOptions[i]);
      }
    }
    if (correctAnswers.length > 0) {
      for (let i = 0; i < correctAnswers.length; i++) {
        await page.fill(`input[name="correct_answers[${i}]"]`, correctAnswers[i]);
      }
    }
    if (isScorable !== undefined) {
      if (isScorable) {
        await page.check('[data-testid="is-scorable-checkbox"]');
      } else {
        await page.uncheck('[data-testid="is-scorable-checkbox"]');
      }
    }
  }

  test.describe('Navigation & Authentication', () => {
    test('should redirect to login if key is missing', async ({ page }) => {
      await page.goto(`/admin/questions/${TEST_EVENT_SLUG}`);
      await expect(page.getByText('Faltan parámetros')).toBeVisible();
    });

    test('should redirect to login if event is missing', async ({ page }) => {
      await page.goto(`/admin/questions/?key=${TEST_ADMIN_KEY}`);
      await expect(page.getByText('Faltan parámetros')).toBeVisible();
    });

    test('should show question editor when authenticated', async ({ page }) => {
      await navigateToQuestionEditor(page);
      // The page might show loading or error if API is not available
      // but it should show the editor structure
      await expect(page.getByText('Editor de Preguntas')).toBeVisible();
    });
  });

  test.describe('Question Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should show validation error for empty key', async ({ page }) => {
      // Click on add question button
      await page.click('button:has-text("Favorites")');
      
      // Try to submit without filling required fields
      const buttonText = 'Crear pregunta';
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Check for validation error
      await expect(page.getByText(/key.*requerido/i)).toBeVisible();
    });

    test('should show validation error for empty question text', async ({ page }) => {
      // Click on add question button
      await page.click('button:has-text("Favorites")');
      
      // Fill only the key
      await page.fill('[data-testid="question-key-input"]', 'test_key_validation');
      
      // Try to submit
      const buttonText = 'Crear pregunta';
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Check for validation error about question text
      await expect(page.getByText(/pregunta.*requerido/i)).toBeVisible();
    });

    test('should show validation error for duplicate key', async ({ page }) => {
      // First create a question
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: 'duplicate_key_test',
        question: 'First question',
        correctAnswers: ['answer'],
      });
      const buttonText = 'Crear pregunta';
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Wait for creation
      await page.waitForTimeout(1000);
      
      // Try to create another with same key
      await page.click('button:has-text("Preferences")');
      await fillQuestionForm(page, {
        key: 'duplicate_key_test',
        question: 'Second question',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Should show duplicate key error
      await expect(page.getByText(/key.*ya existe/i)).toBeVisible();
    });
  });

  test.describe('Create Question Flow', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should create a text question', async ({ page }) => {
      const uniqueKey = 'test_text_question_' + Date.now();
      const buttonText = 'Crear pregunta';
      
      // Click on add question button
      await page.click('button:has-text("Favorites")');
      
      // Fill form
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'What is your favorite color?',
        type: 'text',
        section: 'favorites',
        correctAnswers: ['blue', 'azul'],
        isScorable: true,
      });
      
      // Submit
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Wait for creation
      await page.waitForTimeout(1000);
      
      // Verify question appears in list
      await expect(page.getByText('What is your favorite color?')).toBeVisible();
    });

    test('should create a choice question', async ({ page }) => {
      const uniqueKey = 'test_choice_question_' + Date.now();
      const buttonText = 'Crear pregunta';
      
      // Click on add question button
      await page.click('button:has-text("Preferences")');
      
      // Fill form with choice type
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'Coffee or Tea?',
        type: 'choice',
        section: 'preferences',
        options: ['Coffee', 'Tea'],
        correctAnswers: ['Coffee'],
        isScorable: true,
      });
      
      // Submit
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Wait for creation
      await page.waitForTimeout(1000);
      
      // Verify question appears in list
      await expect(page.getByText('Coffee or Tea?')).toBeVisible();
    });

    test('should create a description question (non-scorable)', async ({ page }) => {
      const uniqueKey = 'test_desc_question_' + Date.now();
      const buttonText = 'Crear pregunta';
      
      // Click on add question button
      await page.click('button:has-text("Description")');
      
      // Fill form - description questions are typically non-scorable
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'Describe yourself in one sentence',
        type: 'text',
        section: 'description',
        correctAnswers: [],
        isScorable: false,
      });
      
      // Submit
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      
      // Wait for creation
      await page.waitForTimeout(1000);
      
      // Verify question appears in list
      await expect(page.getByText('Describe yourself in one sentence')).toBeVisible();
    });
  });

  test.describe('Edit Question Flow', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should edit an existing question', async ({ page }) => {
      const uniqueKey = 'test_edit_question_' + Date.now();
      const createButtonText = 'Crear pregunta';
      const editButtonText = 'Guardar cambios';
      
      // First create a question
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'Original question text',
        correctAnswers: ['original'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${createButtonText}")`);
      await page.waitForTimeout(1000);
      
      // Now edit it - click edit button
      const questionCard = page.locator('[data-question-id]', { hasText: 'Original question text' });
      await questionCard.locator('button[aria-label="Edit"]').click();
      
      // Modify the question text
      await page.fill('[data-testid="question-text-input"]', 'Modified question text');
      
      // Save changes
      await page.click(`button[data-testid="save-question-button"]:has-text("${editButtonText}")`);
      await page.waitForTimeout(1000);
      
      // Verify changes
      await expect(page.getByText('Modified question text')).toBeVisible();
      await expect(page.getByText('Original question text')).not.toBeVisible();
    });
  });

  test.describe('Delete Question Flow', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should delete a question with confirmation', async ({ page }) => {
      const uniqueKey = 'test_delete_question_' + Date.now();
      const buttonText = 'Crear pregunta';
      
      // First create a question to delete
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'Question to delete',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      await page.waitForTimeout(1000);
      
      // Verify it exists
      await expect(page.getByText('Question to delete')).toBeVisible();
      
      // Click delete button
      const questionCard = page.locator('[data-question-id]', { hasText: 'Question to delete' });
      await questionCard.locator('button[aria-label="Delete"]').click();
      
      // Confirm deletion in modal
      await expect(page.getByText('Eliminar pregunta')).toBeVisible();
      await page.click('button:has-text("Eliminar")');
      
      // Wait for deletion
      await page.waitForTimeout(1000);
      
      // Verify it's gone
      await expect(page.getByText('Question to delete')).not.toBeVisible();
    });

    test('should cancel deletion', async ({ page }) => {
      const uniqueKey = 'test_cancel_delete_' + Date.now();
      const buttonText = 'Crear pregunta';
      
      // First create a question
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: uniqueKey,
        question: 'Question to cancel delete',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      await page.waitForTimeout(1000);
      
      // Click delete button
      const questionCard = page.locator('[data-question-id]', { hasText: 'Question to cancel delete' });
      await questionCard.locator('button[aria-label="Delete"]').click();
      
      // Cancel in modal
      await page.click('button:has-text("Cancelar")');
      
      // Verify question still exists
      await expect(page.getByText('Question to cancel delete')).toBeVisible();
    });
  });

  test.describe('Section Grouping', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should group questions by section', async ({ page }) => {
      const buttonText = 'Crear pregunta';
      
      // Create questions in different sections
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: 'section_fav_' + Date.now(),
        question: 'Favorite question',
        section: 'favorites',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      await page.waitForTimeout(500);

      await page.click('button:has-text("Preferences")');
      await fillQuestionForm(page, {
        key: 'section_pref_' + Date.now(),
        question: 'Preference question',
        section: 'preferences',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      await page.waitForTimeout(500);

      // Verify section headers are visible
      await expect(page.getByText('Favorites')).toBeVisible();
      await expect(page.getByText('Preferences')).toBeVisible();
    });
  });

  test.describe('Import/Export', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should have export button', async ({ page }) => {
      // Check export button exists
      await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible();
    });

    test('should have import button', async ({ page }) => {
      // Check import button exists
      await expect(page.getByRole('button', { name: /Importar/i })).toBeVisible();
    });
  });

  test.describe('Drag-Drop Reorder', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToQuestionEditor(page);
    });

    test('should show drag handles for questions', async ({ page }) => {
      const buttonText = 'Crear pregunta';
      
      // Create at least one question
      await page.click('button:has-text("Favorites")');
      await fillQuestionForm(page, {
        key: 'drag_test_' + Date.now(),
        question: 'Draggable question',
        correctAnswers: ['answer'],
      });
      await page.click(`button[data-testid="save-question-button"]:has-text("${buttonText}")`);
      await page.waitForTimeout(1000);
      
      // Check for drag handle (grip icon)
      const dragHandle = page.locator('[data-handle="drag-handle"]').first();
      await expect(dragHandle).toBeVisible();
    });
  });
});
