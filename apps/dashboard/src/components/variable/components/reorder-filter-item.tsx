import { Code2, GripVertical } from 'lucide-react';
import { Reorder, useDragControls, useMotionValue } from 'motion/react';
import { ComponentProps, useMemo, useRef } from 'react';
import { RiCloseLine, RiQuestionLine } from 'react-icons/ri';
import { VariableSelect } from '@/components/conditions-editor/variable-select';
import { buttonVariants } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { LiquidVariable } from '@/utils/parseStepVariables';
import { cn } from '@/utils/ui';
import { getFilters } from '../constants';
import { FilterWithParam } from '../types';
import { validateEnhancedDigestFilters } from '../utils';

const preventClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
};

type ReorderFilterItemProps = ComponentProps<typeof Reorder.Item<FilterWithParam>> & {
  index: number;
  isLast: boolean;
  variableName: string;
  variables: LiquidVariable[];
  onRemove: (value: string) => void;
  onParamChange: (index: number, params: string[]) => void;
};

export const ReorderFilterItem = (props: ReorderFilterItemProps) => {
  const controls = useDragControls();
  const x = useMotionValue(0);
  const { index, isLast, onRemove, onParamChange, value, variableName, variables, ...rest } = props;
  const liquidFilters = useMemo(() => getFilters(), []);
  const itemRef = useRef<HTMLDivElement>(null);

  const filterDef = liquidFilters.find((t) => t.value === value.value);
  const hasParams = filterDef?.hasParam && filterDef.params;

  const isDigestStepEventsVariable = useMemo(() => {
    if (variableName.match(/^steps\..+\.events$/)) {
      return true;
    }

    return false;
  }, [variableName]);

  const options = useMemo(() => {
    // if it's digest step events variable then fill the options with the payload variables
    if (isDigestStepEventsVariable) {
      return variables.filter((v) => v.name.startsWith('payload')).map((v) => ({ label: v.name, value: v.name }));
    }

    return [];
  }, [isDigestStepEventsVariable, variables]);

  const toSentenceIssue = useMemo(() => {
    const hasToSentence = filterDef?.value === 'toSentence';

    if (isDigestStepEventsVariable && hasToSentence && value.params && value.params?.length > 0) {
      const variableWithParams = `${value.value}: ${value.params.join(', ')}`;

      const issues = validateEnhancedDigestFilters([variableWithParams]);

      return issues;
    }

    return null;
  }, [filterDef?.value, isDigestStepEventsVariable, value.params, value.value]);

  return (
    <Reorder.Item
      ref={itemRef}
      value={value}
      className="bg-bg-weak group mb-0 flex flex-col items-center gap-1.5 rounded-md p-1"
      whileDrag={{ scale: 1.02 }}
      transition={{
        type: 'keyframes',
        duration: 0.15,
        ease: [0.32, 0.72, 0, 1],
      }}
      style={{ x }}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => {
        if (itemRef.current) {
          const height = itemRef.current.getBoundingClientRect().height;
          itemRef.current.style.minHeight = `${height}px`;
        }
      }}
      onDragEnd={() => {
        // reset the x position to 0 to avoid the item from being dragged out of the container
        x.set(0);

        if (itemRef.current) {
          itemRef.current.style.minHeight = '';
        }
      }}
      layout="position"
      {...rest}
    >
      <div
        className={cn('flex w-full items-center justify-between gap-2 rounded-lg', {
          'cursor-default': !hasParams,
          'cursor-pointer': hasParams,
        })}
      >
        <div className="flex items-center gap-1">
          <GripVertical
            className="reorder-handle text-text-soft h-3.5 w-3.5"
            onPointerDown={(e) => controls.start(e)}
            onClick={preventClick}
          />

          <span className="text-code-xs select-none">{filterDef?.label}</span>
          <Tooltip>
            <TooltipTrigger className="cursor-pointer" asChild>
              <span>
                <RiQuestionLine className="text-text-soft size-4" onClick={preventClick} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-xs">
              <p className="text-label-xs">{filterDef?.description}</p>
              <p className="text-label-xs">Example: {filterDef?.example}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span
          className={cn(buttonVariants({ variant: 'secondary', mode: 'ghost', size: 'sm', className: 'h-5 p-1' }))}
          onClick={(e) => {
            preventClick(e);
            onRemove(value.value);
          }}
        >
          <RiCloseLine className="size-3.5 text-neutral-400" />
        </span>
      </div>
      {hasParams && (
        <div className="flex w-full flex-col gap-1 py-1">
          {filterDef?.params?.map((param, paramIndex) => {
            const paramInputChangeHandler = (newValue: string) => {
              const newParams = [...(value.params || [])];
              newParams[paramIndex] = newValue;
              onParamChange(index, newParams);
            };

            return (
              <div className="flex flex-col gap-1" key={paramIndex}>
                <label className="text-text-sub text-label-xs flex select-none gap-1">
                  {param.label}
                  {param.tip && (
                    <Tooltip>
                      <TooltipTrigger className="relative cursor-pointer">
                        <RiQuestionLine className="text-text-soft size-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-label-xs">{param.tip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </label>

                {param.type === 'variable' ? (
                  <VariableSelect
                    leftIcon={<Code2 className="text-feature size-3 min-w-3" />}
                    onChange={paramInputChangeHandler}
                    onInputChange={paramInputChangeHandler}
                    options={options}
                    className="w-full"
                    placeholder={param.placeholder}
                    title={param.description}
                    value={value.params?.[paramIndex] || ''}
                    defaultValue={param.defaultValue}
                    isClearable
                    error={toSentenceIssue?.filterParam === param.label ? toSentenceIssue.message : undefined}
                  />
                ) : (
                  <Input
                    value={value.params?.[paramIndex] || ''}
                    defaultValue={param.defaultValue}
                    onChange={(e) => paramInputChangeHandler(e.target.value)}
                    placeholder={param.placeholder}
                    title={param.description}
                    size="2xs"
                    hasError={toSentenceIssue?.filterParam === param.label}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Reorder.Item>
  );
};
