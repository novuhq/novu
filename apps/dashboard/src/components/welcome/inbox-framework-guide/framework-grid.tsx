import type { Framework } from '../framework-guides.instructions';
import { FrameworkCard } from './framework-card';

type FrameworkGridProps = {
  frameworks: Framework[];
  selectedFrameworkName: string;
  onSelect: (framework: Framework) => void;
};

export function FrameworkGrid({ frameworks, selectedFrameworkName, onSelect }: FrameworkGridProps) {
  return (
    <div className="flex gap-2">
      {frameworks.map((framework) => (
        <FrameworkCard
          key={framework.name}
          framework={framework}
          isSelected={framework.name === selectedFrameworkName}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
