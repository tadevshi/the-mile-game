import { motion } from 'framer-motion';
import { TokenSection } from './TokenSection';
import { PostcardsPreviewGrid } from './PostcardsPreviewGrid';
import { RevealButton } from './RevealButton';
import type { PreviewTheme } from '@/themes';

interface SecretBoxTabProps {
  slug: string;
  previewTheme: PreviewTheme;
}

export function SecretBoxTab({ slug, previewTheme }: SecretBoxTabProps) {
  // Use preview theme colors or fallbacks
  const theme: PreviewTheme = previewTheme || {
    primaryColor: '#EC4899',
    secondaryColor: '#FBCFE8',
    accentColor: '#DB2777',
    bgColor: '#FFF5F7',
    textColor: '#1E293B',
    displayFont: 'Great Vibes',
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    backgroundStyle: 'watercolor',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display mb-1" style={{ color: theme.textColor }}>
          Secret Box 🎁
        </h2>
        <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
          Gestiona el link compartible, previsualiza las postales secretas y revela la sorpresa.
        </p>
      </div>

      {/* Section 1: Token / Link Sharing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-2xl backdrop-blur-sm border"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderColor: `${theme.secondaryColor}50`,
        }}
      >
        <TokenSection slug={slug} theme={theme} />
      </motion.div>

      {/* Section 2: Postcards Preview Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-2xl backdrop-blur-sm border"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderColor: `${theme.secondaryColor}50`,
        }}
      >
        <PostcardsPreviewGrid slug={slug} theme={theme} />
      </motion.div>

      {/* Section 3: Reveal Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-2xl backdrop-blur-sm border"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderColor: `${theme.secondaryColor}50`,
        }}
      >
        <RevealButton slug={slug} theme={theme} />
      </motion.div>
    </div>
  );
}
