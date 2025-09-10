import { motion } from 'motion/react';
import { Card, CardContent } from '../../primitives/card';
import type { Framework } from '../framework-guides.instructions';

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

const ICON_VARIANTS = {
  initial: { scale: 1 },
  hover: {
    scale: 1.1,
    transition: { scale: { duration: 0.2, ease: 'easeOut' } },
  },
};

type FrameworkCardProps = {
  framework: Framework;
  isSelected: boolean;
  onSelect: (framework: Framework) => void;
};

export function FrameworkCard({ framework, isSelected, onSelect }: FrameworkCardProps) {
  return (
    <motion.div variants={CARD_VARIANTS} whileHover="hover" className="relative">
      <Card
        onClick={() => onSelect(framework)}
        className={`flex h-[100px] w-[100px] flex-col items-center justify-center border-none p-6 shadow-none hover:cursor-pointer ${
          isSelected ? 'bg-neutral-100' : ''
        }`}
      >
        <CardContent className="flex flex-col items-center gap-3 p-0">
          <motion.div variants={ICON_VARIANTS} animate={isSelected ? 'hover' : 'initial'} className="relative text-2xl">
            {framework.icon}
          </motion.div>
          <span className="text-sm text-[#525866]">{framework.name}</span>
        </CardContent>
      </Card>
    </motion.div>
  );
}
