import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

type PasswordStrength = 'weak' | 'medium' | 'strong';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError(t('auth.invalidOrExpiredToken'));
    }
  }, [token, t]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.password;
    if (!password) {
      setPasswordStrength('weak');
      return;
    }

    let strength: PasswordStrength = 'weak';
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;

    const score = [hasLower, hasUpper, hasNumber, hasSpecial, length >= 8].filter(Boolean).length;

    if (length >= 6 && score >= 3) {
      strength = 'medium';
    }
    if (length >= 8 && score >= 4) {
      strength = 'strong';
    }

    setPasswordStrength(strength);
  }, [formData.password]);

  // Redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!token) {
      errors.token = t('auth.invalidOrExpiredToken');
    }

    if (!formData.password) {
      errors.password = t('auth.password') + ' ' + t('common.required').toLowerCase();
    } else if (formData.password.length < 6) {
      errors.password = t('auth.password') + ' ' + t('auth.minLength').toLowerCase();
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.passwordsMismatch');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.resetPassword(token!, formData.password);
      setSuccess(true);
    } catch {
      setError(t('auth.invalidOrExpiredToken'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const getStrengthLabel = (strength: PasswordStrength): string => {
    switch (strength) {
      case 'weak':
        return t('auth.weak');
      case 'medium':
        return t('auth.medium');
      case 'strong':
        return t('auth.strong');
    }
  };

  // Token invalid state
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-secondary)] to-[var(--color-bg)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Error Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display text-[var(--color-accent)] mb-2">
                {t('auth.resetPasswordTitle')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t('auth.invalidOrExpiredToken')}
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

  // Success state
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
                {t('auth.resetPasswordTitle')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t('auth.passwordResetSuccess')}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Redirecting to login...
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
              {t('auth.resetPasswordTitle')}
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
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.newPassword')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    validationErrors.password
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-[var(--color-secondary)] focus:border-[var(--color-accent)]'
                  } bg-white/50`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.password}</p>
              )}

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength === 'weak'
                          ? 'bg-red-300'
                          : passwordStrength === 'medium'
                          ? 'bg-red-300'
                          : 'bg-red-300'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength === 'weak' ? 'bg-gray-200' : passwordStrength === 'medium' ? 'bg-yellow-300' : 'bg-yellow-300'
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength === 'strong' ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      passwordStrength === 'weak'
                        ? 'text-red-500'
                        : passwordStrength === 'medium'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {getStrengthLabel(passwordStrength)}
                    </span>
                    {passwordStrength === 'strong' && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.confirmNewPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    validationErrors.confirmPassword
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-[var(--color-secondary)] focus:border-[var(--color-accent)]'
                  } bg-white/50`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.confirmPassword}</p>
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
                  <Lock className="w-5 h-5" />
                  {t('auth.resetPassword')}
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