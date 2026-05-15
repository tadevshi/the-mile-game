import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * LandingFooter - About, Contact, Privacy, Terms, social links.
 */
export function LandingFooter() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="px-4 py-12 border-t"
      style={{
        borderColor: 'var(--surface-container)',
        background: 'var(--surface-container-low)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary)' }}
              >
                EventHub
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--on-surface-variant)' }}>
              {t('landing.footer.description')}
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {[
                { label: 'Instagram', icon: '📸', href: '#' },
                { label: 'Twitter', icon: '🐦', href: '#' },
                { label: 'Facebook', icon: '👤', href: '#' },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors"
                  style={{
                    background: 'var(--surface-container)',
                    color: 'var(--on-surface-variant)',
                  }}
                  aria-label={social.label}
                  title={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4
              className="font-semibold mb-3 text-sm"
              style={{ color: 'var(--on-surface)' }}
            >
              {t('landing.footer.product')}
            </h4>
            <ul className="space-y-2">
              {[
                { label: t('landing.footer.functions'), href: '#features' },
                { label: t('landing.pricing.prices'), href: '#pricing' },
                { label: t('landing.footer.demo'), href: '#demo' },
                { label: t('landing.footer.faq'), href: '#faq' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:underline"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4
              className="font-semibold mb-3 text-sm"
              style={{ color: 'var(--on-surface)' }}
            >
              {t('landing.footer.legal')}
            </h4>
            <ul className="space-y-2">
              {[
                { label: t('landing.footer.privacy'), href: '/privacy' },
                { label: t('landing.footer.terms'), href: '/terms' },
                { label: t('landing.footer.contact'), href: '/contact' },
                { label: t('landing.footer.about'), href: '/about' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:underline"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--surface-container)' }}
        >
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            © {currentYear} EventHub. {t('landing.footer.rights')}
          </p>
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            {t('landing.footer.madeWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}
