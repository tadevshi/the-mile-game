import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingTier {
  name: string;
  price?: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  ctaVariant: 'primary' | 'outline';
  popular?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    description: 'Ideal para probar EventHub con eventos pequeños',
    features: [
      { text: 'Hasta 20 invitados por evento', included: true },
      { text: '1 evento activo', included: true },
      { text: 'Quiz básico (10 preguntas)', included: true },
      { text: 'Cartelera de fotos', included: true },
      { text: 'Ranking en tiempo real', included: true },
      { text: 'Analytics básicos', included: false },
      { text: 'Caja Secreta', included: false },
      { text: 'Videos en postal', included: false },
      { text: 'Soporte prioritario', included: false },
      { text: 'Eventos ilimitados', included: false },
    ],
    cta: 'Empezar gratis',
    ctaVariant: 'outline',
  },
  {
    name: 'Premium',
    description: 'Para celebraciones memorables sin límites',
    features: [
      { text: 'Invitados ilimitados', included: true },
      { text: 'Eventos ilimitados', included: true },
      { text: 'Quiz completo (preguntas ilimitadas)', included: true },
      { text: 'Cartelera de fotos + videos', included: true },
      { text: 'Ranking en tiempo real', included: true },
      { text: 'Analytics avanzados', included: true },
      { text: 'Caja Secreta', included: true },
      { text: 'Videos en postal', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Temas personalizados', included: true },
    ],
    cta: 'Desbloquear Premium',
    ctaVariant: 'primary',
    popular: true,
  },
];

/**
 * PricingTable - Free vs Premium comparison with CTA buttons.
 * Price point: $4.99 USD (user-specified).
 */
export function PricingTable() {
  const navigate = useNavigate();

  const handleCTA = (tier: PricingTier) => {
    if (tier.name === 'Free') {
      navigate('/register');
    } else {
      // Premium: redirect to register (payment handled separately for MVP)
      navigate('/register');
    }
  };

  return (
    <section
      className="px-4 py-16"
      style={{ background: 'var(--surface-container-low)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-sm font-medium rounded-full mb-4">
            Precios
          </span>
          <h2 className="text-2xl md:text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
            Simple y transparente
          </h2>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            Empezá gratis, actualizá cuando quieras
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 ${
                tier.popular
                  ? 'shadow-xl shadow-pink-200/50 dark:shadow-pink-900/30'
                  : 'shadow-md'
              }`}
              style={
                tier.popular
                  ? {
                      background: 'linear-gradient(135deg, var(--primary) 0%, #BE185D 100%)',
                      color: 'white',
                    }
                  : {
                      background: 'var(--surface-container)',
                      border: '1px solid var(--surface-container-high)',
                    }
              }
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-pink-600 text-xs font-bold px-3 py-1 rounded-full shadow">
                    ⭐ Más popular
                  </span>
                </div>
              )}

              {/* Tier name */}
              <h3
                className="text-xl font-semibold mb-1"
                style={{
                  fontFamily: 'var(--font-serif)',
                  ...(tier.popular ? { color: 'white' } : {}),
                }}
              >
                {tier.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                {tier.price ? (
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-bold"
                      style={tier.popular ? { color: 'white' } : { color: 'var(--primary)' }}
                    >
                      {tier.price}
                    </span>
                    <span
                      className="text-sm"
                      style={
                        tier.popular
                          ? { color: 'rgba(255,255,255,0.7)' }
                          : { color: 'var(--on-surface-variant)' }
                      }
                    >
                      USD
                    </span>
                  </div>
                ) : (
                  <div
                    className="text-3xl font-bold"
                    style={tier.popular ? { color: 'white' } : { color: 'var(--primary)' }}
                  >
                    $0
                    <span
                      className="text-sm font-normal ml-1"
                      style={
                        tier.popular
                          ? { color: 'rgba(255,255,255,0.7)' }
                          : { color: 'var(--on-surface-variant)' }
                      }
                    >
                      gratis para siempre
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p
                className="text-sm mb-6"
                style={
                  tier.popular
                    ? { color: 'rgba(255,255,255,0.8)' }
                    : { color: 'var(--on-surface-variant)' }
                }
              >
                {tier.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 mt-0.5">
                      {feature.included ? (
                        <span
                          className="text-lg"
                          style={tier.popular ? { color: 'white' } : { color: 'var(--primary)' }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className="text-lg"
                          style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }}
                        >
                          ✕
                        </span>
                      )}
                    </span>
                    <span
                      style={
                        feature.included
                          ? tier.popular
                            ? { color: 'white' }
                            : { color: 'var(--on-surface)' }
                          : { color: 'var(--on-surface-variant)', opacity: 0.5 }
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCTA(tier)}
                className={`w-full py-3 rounded-full font-semibold transition-colors ${
                  tier.popular
                    ? 'bg-white text-pink-600 hover:bg-pink-50'
                    : 'border-2 hover:opacity-80'
                }`}
                style={
                  !tier.popular
                    ? {
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                      }
                    : {}
                }
              >
                {tier.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Trust signals */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs mt-6"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Sin tarjeta de crédito requerida · Cancela cuando quieras
        </motion.p>
      </div>
    </section>
  );
}
