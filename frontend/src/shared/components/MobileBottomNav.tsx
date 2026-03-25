import { Link, useLocation } from 'react-router-dom';
import { Home, Target, Trophy, Pin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeatureEnabled } from '@/shared/store/eventStore';

interface NavItem {
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  path: (slug: string) => string;
  enabled: boolean;
}

interface MobileBottomNavProps {
  slug: string;
}

export function MobileBottomNav({ slug }: MobileBottomNavProps) {
  const location = useLocation();
  const quizEnabled = useFeatureEnabled('quiz');
  const corkboardEnabled = useFeatureEnabled('corkboard');

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: 'Inicio',
      path: (s) => `/e/${s}`,
      enabled: true,
    },
    {
      icon: Target,
      label: 'Quiz',
      path: (s) => `/e/${s}/quiz`,
      enabled: quizEnabled,
    },
    {
      icon: Trophy,
      label: 'Ranking',
      path: (s) => `/e/${s}/ranking`,
      enabled: true,
    },
    {
      icon: Pin,
      label: 'Cartelera',
      path: (s) => `/e/${s}/corkboard`,
      enabled: corkboardEnabled,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center py-2">
        {navItems
          .filter((item) => item.enabled)
          .map((item) => {
            const path = item.path(slug);
            const active = isActive(path);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={path}
                className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-2 rounded-lg transition-colors"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-0.5 ${
                    active
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-on-surface-muted)]'
                  }`}
                >
                  <Icon
                    size={22}
                    className="transition-transform"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-medium font-sans">
                    {item.label}
                  </span>
                </motion.div>

                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -bottom-2 w-1 h-1 rounded-full bg-[var(--color-primary)]"
                  />
                )}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
