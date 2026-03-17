import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/shared';
import type { QuestionSection } from '../types/questions.types';
import { SECTION_LABELS } from '../types/questions.types';

interface SectionHeaderProps {
  section: QuestionSection;
  count: number;
  onAddQuestion: (section: QuestionSection) => void;
}

const SECTION_ICONS: Record<QuestionSection, string> = {
  favorites: '⭐',
  preferences: '🤔',
  description: '✍️',
};

export function SectionHeader({ section, count, onAddQuestion }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-2 px-3 bg-pink-50/50 rounded-t-xl border-b border-pink-100"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{SECTION_ICONS[section]}</span>
        <h3 className="font-display text-gray-700">
          {SECTION_LABELS[section]}
        </h3>
        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddQuestion(section)}
        icon={<Plus size={14} />}
        className="text-xs"
      >
        Agregar
      </Button>
    </motion.div>
  );
}
