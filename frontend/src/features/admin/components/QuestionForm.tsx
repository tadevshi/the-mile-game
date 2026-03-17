import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared';
import type { 
  QuizQuestion, 
  QuestionFormData, 
  QuestionType, 
  QuestionSection 
} from '../types/questions.types';
import { 
  INITIAL_QUESTION_FORM, 
  TYPE_LABELS, 
  SECTION_LABELS 
} from '../types/questions.types';

interface QuestionFormProps {
  question?: QuizQuestion | null;
  existingKeys: string[];
  isSubmitting: boolean;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
}

export function QuestionForm({
  question,
  existingKeys,
  isSubmitting,
  onSubmit,
  onCancel,
}: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionFormData>(INITIAL_QUESTION_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      setFormData({
        key: question.key,
        type: question.type,
        section: question.section,
        question: question.data.question,
        options: question.data.options || ['', ''],
        correct_answers: question.data.correct_answers,
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, options: newOptions }));
    }
  };

  const handleCorrectAnswerChange = (value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      correct_answers: checked
        ? [...prev.correct_answers, value]
        : prev.correct_answers.filter((a) => a !== value),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.key.trim()) {
      newErrors.key = 'La clave es requerida';
    } else if (!question && existingKeys.includes(formData.key.trim())) {
      newErrors.key = 'Ya existe una pregunta con esta clave';
    }

    if (!formData.question.trim()) {
      newErrors.question = 'La pregunta es requerida';
    }

    if (formData.type === 'choice' && formData.options.length < 2) {
      newErrors.options = 'Se requieren al menos 2 opciones';
    }

    if (formData.type === 'choice' && formData.correct_answers.length === 0) {
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
      options: formData.type === 'choice' 
        ? formData.options.filter((o) => o.trim() !== '')
        : [],
      correct_answers: formData.type === 'boolean'
        ? [formData.type === 'boolean' ? 'true' : ''].filter(Boolean)
        : formData.correct_answers.filter((a) => a.trim() !== ''),
    };

    onSubmit(submitData);
  };

  const showOptions = formData.type === 'choice';
  const showCorrectAnswers = formData.type !== 'text';

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100 p-4">
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

        {/* Type & Section Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as QuestionType)}
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-200 
                         focus:border-primary rounded-b-lg focus:outline-none text-sm"
            >
              <option value="text">Texto</option>
              <option value="choice">Opción múltiple</option>
              <option value="boolean">Verdadero/Falso</option>
            </select>
          </div>
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
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pregunta
          </label>
          <textarea
            value={formData.question}
            onChange={(e) => handleChange('question', e.target.value)}
            placeholder="¿Cuál es tu cantante favorito?"
            rows={2}
            className={`
              w-full px-3 py-2 bg-transparent border-b-2 rounded-b-lg
              focus:outline-none transition-colors resize-none
              ${errors.question 
                ? 'border-red-400 focus:border-red-500' 
                : 'border-gray-200 focus:border-primary'
              }
            `}
          />
          {errors.question && <p className="text-red-500 text-xs mt-1">{errors.question}</p>}
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
                Respuesta(s) correcta(s)
              </label>
              {formData.type === 'boolean' ? (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.correct_answers.includes('true')}
                      onChange={(e) => handleCorrectAnswerChange('true', e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Verdadero</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.correct_answers.includes('false')}
                      onChange={(e) => handleCorrectAnswerChange('false', e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Falso</span>
                  </label>
                </div>
              ) : (
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
                </div>
              )}
              {errors.correct_answers && (
                <p className="text-red-500 text-xs">{errors.correct_answers}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Is Scorable */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_scorable"
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
          >
            {question ? 'Guardar cambios' : 'Crear pregunta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
