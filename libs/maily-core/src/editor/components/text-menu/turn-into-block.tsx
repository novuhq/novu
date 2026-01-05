/* cspell:ignore Pilcrow */
import { ChevronDownIcon, PilcrowIcon } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/editor/utils/classname';
import { BaseButton } from '../base-button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { TurnIntoBlockCategory, TurnIntoBlockOptions, TurnIntoOptions } from './use-turn-into-block-options';

type TurnIntoBlockProps = {
  options: TurnIntoOptions;
};

const isOption = (option: TurnIntoOptions[number]): option is TurnIntoBlockOptions => option.type === 'option';
const isCategory = (option: TurnIntoOptions[number]): option is TurnIntoBlockCategory => option.type === 'category';

export function TurnIntoBlock(props: TurnIntoBlockProps) {
  const { options } = props;

  const activeItem = useMemo(
    () => options.find((option) => option.type === 'option' && option.isActive()),
    [options]
  ) as TurnIntoBlockOptions | undefined;
  const { icon: ActiveIcon = PilcrowIcon } = activeItem || {};

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            className={cn(
              'mly-flex mly-aspect-square mly-h-7 mly-items-center mly-justify-center mly-gap-1 mly-rounded-md mly-px-1.5 mly-text-sm data-[state=open]:mly-bg-soft-gray hover:mly-bg-soft-gray focus-visible:mly-relative focus-visible:mly-z-10 focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2'
            )}
          >
            <ActiveIcon className="mly-h-3 mly-w-3 mly-shrink-0 mly-stroke-[2.5]" />
            <ChevronDownIcon className="mly-h-3 mly-w-3 mly-shrink-0 mly-stroke-[2.5]" />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>Turn into</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="mly-flex mly-w-[160px] mly-flex-col mly-rounded-md mly-p-1"
      >
        {options.map((option, index) => {
          if (isOption(option)) {
            return (
              <BaseButton
                key={option.id}
                onClick={option.onClick}
                variant="ghost"
                className="mly-h-auto mly-justify-start mly-gap-2 !mly-rounded mly-px-2 mly-py-1 mly-text-sm mly-font-normal mly-text-midnight-gray"
              >
                <option.icon className="mly-size-[15px] mly-shrink-0" />
                {option.label}
              </BaseButton>
            );
          } else if (isCategory(option)) {
            return (
              <label
                key={option.id}
                className={cn(
                  'mly-px-2 mly-text-xs mly-font-medium mly-text-midnight-gray/60',
                  index === 0 ? 'mly-mb-2 mly-mt-1' : 'mly-my-2'
                )}
              >
                {option.label}
              </label>
            );
          }
          return null;
        })}
      </PopoverContent>
    </Popover>
  );
}
