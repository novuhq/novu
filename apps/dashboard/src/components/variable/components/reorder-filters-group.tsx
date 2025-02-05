import { Reorder } from 'motion/react';
import { useRef } from 'react';
import { FilterWithParam } from '../types';
import { ReorderFilterItem } from './reorder-filter-item';

type FiltersListProps = {
  filters: FilterWithParam[];
  onReorder: (newOrder: FilterWithParam[]) => void;
  onRemove: (value: string) => void;
  onParamChange: (index: number, params: string[]) => void;
};

export function ReorderFiltersGroup({ filters, onReorder, onRemove, onParamChange }: FiltersListProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  if (filters.length === 0) return null;

  return (
    <div className="rounded-8 border-stroke-soft flex flex-col gap-0.5 border px-1 py-1.5" data-filters-container>
      <Reorder.Group ref={groupRef} axis="y" values={filters} onReorder={onReorder}>
        {filters.map((filter, index) => (
          <ReorderFilterItem
            key={filter.value}
            value={filter}
            index={index}
            isLast={index === filters.length - 1}
            onRemove={onRemove}
            dragConstraints={groupRef}
            onParamChange={onParamChange}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}
