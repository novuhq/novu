import { Reorder } from 'motion/react';
import { LiquidVariable } from '@/utils/parseStepVariables';
import { FilterWithParam } from '../types';
import { ReorderFilterItem } from './reorder-filter-item';

type FiltersListProps = {
  variables: LiquidVariable[];
  variableName: string;
  filters: FilterWithParam[];
  onReorder: (newOrder: FilterWithParam[]) => void;
  onRemove: (value: string) => void;
  onParamChange: (index: number, params: string[]) => void;
};

export function ReorderFiltersGroup({
  filters,
  onReorder,
  onRemove,
  onParamChange,
  variableName,
  variables,
}: FiltersListProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className="rounded-8 border-stroke-soft flex max-h-56 flex-col gap-0.5 overflow-y-auto border px-1 py-1.5"
      data-filters-container
    >
      <Reorder.Group axis="y" values={filters} onReorder={onReorder} className="flex flex-col gap-2">
        {filters.map((filter, index) => (
          <ReorderFilterItem
            key={filter.value}
            value={filter}
            index={index}
            isLast={index === filters.length - 1}
            onRemove={onRemove}
            onParamChange={onParamChange}
            variableName={variableName}
            variables={variables}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}
