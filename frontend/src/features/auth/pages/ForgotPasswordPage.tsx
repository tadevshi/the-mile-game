import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError(t('common.required'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setValidationError(t('auth.email') + ' ' + t('errors.notFound').toLowerCase());
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) return;

    setIsLoading(true);
    try {
      await api.requestPasswordReset(email);
      setSuccess(true);
    } catch {
      // Even on error, show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-secondary)] to-[var(--color-bg)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
            </div>

            {/* Success Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display text-[var(--color-accent)] mb-2">
                {t('auth.forgotPasswordTitle')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t('auth.resetEmailSent')}
              </p>
            </div>

            {/* Back to Login */}
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-5 h-5" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-secondary)] to-[var(--color-bg)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display text-[var(--color-accent)] mb-2">
              {t('auth.forgotPasswordTitle')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('auth.forgotPasswordSubtitle')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    validationError
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-[var(--color-secondary)] focus:border-[var(--color-accent)]'
                  } bg-white/50`}
                  placeholder="tu@email.com"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {validationError && (
                <p className="mt-1 text-sm text-red-500">{validationError}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:to-[var(--color-primary)] shadow-lg shadow-[var(--color-secondary)]"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t('auth.sendResetLink')}
                </span>
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}