import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared';
import type { 
  QuizQuestion, 
  QuestionFormData, 
  QuestionSection 
} from '../types/questions.types';
import { 
  INITIAL_QUESTION_FORM
} from '../types/questions.types';

interface QuestionFormProps {
  question?: QuizQuestion | null;
  existingKeys: string[];
  isSubmitting: boolean;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onChange?: (data: QuestionFormData) => void; // NEW - for preview
}

export function QuestionForm({
  question,
  existingKeys,
  isSubmitting,
  onSubmit,
  onCancel,
  onChange,
}: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionFormData>(INITIAL_QUESTION_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine if this is a choice type based on whether options exist
  const isChoiceType = formData.options.length > 0;

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      setFormData({
        key: question.key,
        section: question.section,
        question_text: question.question_text,
        options: question.options || ['', ''],
        correct_answers: question.correct_answers,
        is_scorable: question.is_scorable,
      });
    } else {
      setFormData(INITIAL_QUESTION_FORM);
    }
    setErrors({});
  }, [question]);

  const handleChange = (
    field: keyof QuestionFormData,
    value: string | string[] | boolean
  ) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange?.(newData); // Notify parent for preview
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    const newData = { ...formData, options: newOptions };
    setFormData(newData);
    onChange?.(newData);
  };

  const addOption = () => {
    const newData = { ...formData, options: [...formData.options, ''] };
    setFormData(newData);
    onChange?.(newData);
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      const newData = { ...formData, options: newOptions };
      setFormData(newData);
      onChange?.(newData);
    }
  };

  const handleCorrectAnswerChange = (value: string, checked: boolean) => {
    const newCorrectAnswers = checked
      ? [...formData.correct_answers, value]
      : formData.correct_answers.filter((a) => a !== value);
    const newData = { ...formData, correct_answers: newCorrectAnswers };
    setFormData(newData);
    onChange?.(newData);
  };

  // Helper to normalize a key
  const normalizeKey = (key: string): string => {
    return key.trim().toLowerCase().replace(/\s+/g, '_');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Normalize key for validation
    const normalizedKey = normalizeKey(formData.key);

    // Check if normalized key is empty
    if (!normalizedKey) {
      newErrors.key = 'La clave es requerida';
    } else {
      // Check for duplicates - on create AND edit (excluding current question's key)
      const isDuplicate = existingKeys.some(k => {
        const isSameKey = normalizeKey(k) === normalizedKey;
        const isCurrentQuestion = question && normalizeKey(question.key) === normalizedKey;
        return isSameKey && !isCurrentQuestion;
      });

      if (isDuplicate) {
        newErrors.key = 'Ya existe una pregunta con esta clave';
      }
    }

    if (!formData.question_text.trim()) {
      newErrors.question_text = 'La pregunta es requerida';
    }

    if (isChoiceType && formData.options.length < 2) {
      newErrors.options = 'Se requieren al menos 2 opciones';
    }

    if (isChoiceType && formData.correct_answers.length === 0) {
      newErrors.correct_answers = 'Selecciona al menos una respuesta correcta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean up the data
    const submitData: QuestionFormData = {
      ...formData,
      key: formData.key.trim().toLowerCase().replace(/\s+/g, '_'),
      question_text: formData.question_text.trim(),
      options: isChoiceType 
        ? formData.options.filter((o) => o.trim() !== '')
        : [],
      correct_answers: formData.correct_answers.filter((a) => a.trim() !== ''),
    };

    onSubmit(submitData);
  };

  const showOptions = isChoiceType;
  // Always show correct answers if is_scorable is true (text questions can be scorable too)
  const showCorrectAnswers = formData.is_scorable;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--color-secondary)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-gray-800">
          {question ? 'Editar Pregunta' : 'Nueva Pregunta'}
        </h2>
        {question && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clave única
          </label>
          <input
            type="text"
            name="key"
            data-testid="question-key-input"
            value={formData.key}
            onChange={(e) => handleChange('key', e.target.value)}
            placeholder="ej: favorite_singer"
            className={`
              w-full px-3 py-2 bg-transparent border-b-2 rounded-b-lg
              focus:outline-none transition-colors
              ${errors.key 
                ? 'border-red-400 focus:border-red-500' 
                : 'border-gray-200 focus:border-primary'
              }
            `}
          />
          {errors.key && <p className="text-red-500 text-xs mt-1">{errors.key}</p>}
          <p className="text-gray-400 text-[10px] mt-0.5">
            Identificador único (sin espacios)
          </p>
        </div>

        {/* Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sección
          </label>
          <select
            value={formData.section}
            onChange={(e) => handleChange('section', e.target.value as QuestionSection)}
            className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-200 
                       focus:border-primary rounded-b-lg focus:outline-none text-sm"
          >
            <option value="favorites">Favoritos</option>
            <option value="preferences">Preferencias</option>
            <option value="description">Descripción</option>
          </select>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pregunta
          </label>
          <textarea
            name="question_text"
            data-testid="question-text-input"
            value={formData.question_text}
            onChange={(e) => handleChange('question_text', e.target.value)}
            placeholder="¿Cuál es tu cantante favorito?"
            rows={2}
            className={`
              w-full px-3 py-2 bg-transparent border-b-2 rounded-b-lg
              focus:outline-none transition-colors resize-none
              ${errors.question_text 
                ? 'border-red-400 focus:border-red-500' 
                : 'border-gray-200 focus:border-primary'
              }
            `}
          />
          {errors.question_text && <p className="text-red-500 text-xs mt-1">{errors.question_text}</p>}
        </div>

        {/* Toggle for choice type */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_choice"
            checked={isChoiceType}
            onChange={(e) => {
              let newData: QuestionFormData;
              if (e.target.checked) {
                newData = { ...formData, options: ['', ''] };
              } else {
                newData = { ...formData, options: [], correct_answers: [] };
              }
              setFormData(newData);
              onChange?.(newData);
            }}
            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
          <label htmlFor="is_choice" className="text-sm text-gray-700 cursor-pointer">
            Opción múltiple (en lugar de texto libre)
          </label>
        </div>

        {/* Options (for choice type) */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-gray-700">
                Opciones
              </label>
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-transparent border-b-2 border-gray-200 
                               focus:border-primary rounded-b-lg focus:outline-none text-sm"
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-sm text-primary hover:text-accent transition-colors"
              >
                <Plus size={14} /> Agregar opción
              </button>
              {errors.options && <p className="text-red-500 text-xs">{errors.options}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Correct Answers */}
        <AnimatePresence>
          {showCorrectAnswers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-gray-700">
                {isChoiceType ? 'Respuesta(s) correcta(s)' : 'Respuesta correcta'}
              </label>
              
              {isChoiceType ? (
                /* Choice type: checkboxes for each option */
                <div className="space-y-1">
                  {formData.options.map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.correct_answers.includes(option)}
                        onChange={(e) => handleCorrectAnswerChange(option, e.target.checked)}
                        disabled={!option.trim()}
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-600 truncate">{option || `Opción ${index + 1}`}</span>
                    </label>
                  ))}
                  {errors.correct_answers && (
                    <p className="text-red-500 text-xs">{errors.correct_answers}</p>
                  )}
                </div>
              ) : (
                /* Text type: single text input for correct answer */
                <div>
                  <input
                    type="text"
                    value={formData.correct_answers[0] || ''}
                    onChange={(e) => handleChange('correct_answers', e.target.value ? [e.target.value] : [])}
                    placeholder="Escribe la respuesta correcta"
                    className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-200 
                               focus:border-primary rounded-b-lg focus:outline-none text-sm"
                  />
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    La respuesta se comparará con texto libre del jugador (sin distinción de mayúsculas/minúsculas)
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Is Scorable */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_scorable"
            data-testid="is-scorable-checkbox"
            checked={formData.is_scorable}
            onChange={(e) => handleChange('is_scorable', e.target.checked)}
            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
          <label htmlFor="is_scorable" className="text-sm text-gray-700 cursor-pointer">
            Pregunta puntuable
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            icon={<Save size={18} />}
            data-testid="save-question-button"
          >
            {question ? 'Guardar cambios' : 'Crear pregunta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
