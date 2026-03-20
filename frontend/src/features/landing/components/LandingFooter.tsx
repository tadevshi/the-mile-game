import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * LandingFooter - About, Contact, Privacy, Terms, social links.
 */
export function LandingFooter() {
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
              Creá experiencias memorables para tus celebraciones.
              Eventos interactivos con quizzes, carteleras de fotos y cajas secretas.
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
              Producto
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Funciones', href: '#features' },
                { label: 'Precios', href: '#pricing' },
                { label: 'Demo', href: '#demo' },
                { label: 'FAQ', href: '#faq' },
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
              Legal
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Política de Privacidad', href: '/privacy' },
                { label: 'Términos de Servicio', href: '/terms' },
                { label: 'Contacto', href: '/contact' },
                { label: 'Sobre nosotros', href: '/about' },
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
            © {currentYear} EventHub. Todos los derechos reservados.
          </p>
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Hecho con ❤️ para celebraciones memorables
          </p>
        </div>
      </div>
    </footer>
  );
}
