import { Button } from '@/components/primitives/button';
import { FilterWithParam } from '@/components/primitives/control-input/variable-popover/types';
import { InputPure } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { GripVertical } from 'lucide-react';
import { Reorder } from 'motion/react';
import { ComponentProps } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { FILTERS } from '../constants';

type ReorderFilterItemProps = ComponentProps<typeof Reorder.Item<FilterWithParam>> & {
  index: number;
  isLast: boolean;
  onRemove: (value: string) => void;
  onParamChange: (index: number, params: string[]) => void;
};

export const ReorderFilterItem = (props: ReorderFilterItemProps) => {
  const { index, isLast, onRemove, onParamChange, value, ...rest } = props;
  const filterDef = FILTERS.find((t) => t.value === value.value);

  return (
    <Reorder.Item
      value={value}
      className="group mb-0 flex items-center gap-1.5 rounded-md p-0.5"
      whileDrag={{ scale: 1.02 }}
      transition={{
        duration: 0.15,
        ease: [0.32, 0.72, 0, 1],
      }}
      {...rest}
    >
      <GripVertical className="text-text-soft h-3.5 w-3.5" />
      <div className="flex flex-1 items-center gap-1">
        <div className="border-stroke-soft text-text-sub text-paragraph-xs bg-bg-weak rounded-8 flex w-full flex-row items-center border">
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <div className="cursor-help px-2 py-1.5 pr-0">{filterDef?.label}</div>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" className="font-mono text-[10px]">
              {filterDef?.example}
            </TooltipContent>
          </Tooltip>
          {filterDef?.hasParam && filterDef.params && (
            <div className="flex flex-1 flex-col gap-1 py-1">
              {filterDef.params.map((param, paramIndex) => (
                <InputPure
                  key={paramIndex}
                  value={value.params?.[paramIndex] || ''}
                  onChange={(e) => {
                    const newParams = [...(value.params || [])];
                    newParams[paramIndex] = e.target.value;
                    onParamChange(index, newParams);
                  }}
                  className="border-stroke-soft ml-1 h-[20px] w-[calc(100%-8px)] border-l pl-1 text-xs"
                  placeholder={param.placeholder}
                  title={param.description}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        mode="ghost"
        size="sm"
        className="text-text-soft hover:text-destructive h-4 w-4 p-0"
        onClick={() => onRemove(value.value)}
      >
        <RiCloseLine className="h-3.5 w-3.5" />
      </Button>
    </Reorder.Item>
  );
};
