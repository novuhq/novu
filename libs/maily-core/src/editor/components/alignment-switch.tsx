import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { AllowedLogoAlignment, allowedLogoAlignment } from '../nodes/logo/logo';
import { cn } from '../utils/classname';
import { BubbleMenuButton } from './bubble-menu-button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type AlignmentSwitchProps = {
  alignment: AllowedLogoAlignment;
  onAlignmentChange: (alignment: AllowedLogoAlignment) => void;
};

export function AlignmentSwitch(props: AlignmentSwitchProps) {
  const { alignment: rawAlignment, onAlignmentChange } = props;
  const alignment = allowedLogoAlignment.includes(rawAlignment as AllowedLogoAlignment) ? rawAlignment : 'left';

  const alignments = {
    left: {
      icon: AlignLeft,
      tooltip: 'Align Left',
      onClick: () => {
        onAlignmentChange('left');
      },
    },
    center: {
      icon: AlignCenter,
      tooltip: 'Align Center',
      onClick: () => {
        onAlignmentChange('center');
      },
    },
    right: {
      icon: AlignRight,
      tooltip: 'Align Right',
      onClick: () => {
        onAlignmentChange('right');
      },
    },
  };

  const activeAlignment = alignments[alignment];

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            className={cn(
              'mly-flex mly-size-7 mly-items-center mly-justify-center mly-gap-1 mly-rounded-md mly-px-1.5 mly-text-sm data-[state=open]:mly-bg-soft-gray hover:mly-bg-soft-gray focus-visible:mly-relative focus-visible:mly-z-10 focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2'
            )}
          >
            <activeAlignment.icon className="mly-h-3 mly-w-3 mly-stroke-[2.5]" />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>Alignment</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="mly-flex mly-w-max mly-gap-0.5 mly-rounded-lg !mly-p-0.5"
        side="top"
        sideOffset={8}
        align="center"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {Object.entries(alignments).map(([key, value]) => {
          return (
            <BubbleMenuButton
              key={key}
              icon={value.icon}
              tooltip={value.tooltip}
              command={value.onClick}
              isActive={() => key === alignment}
            />
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
