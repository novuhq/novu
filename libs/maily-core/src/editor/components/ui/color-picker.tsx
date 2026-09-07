'use client';

import { ReactNode } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { cn } from '@/editor/utils/classname';
import { BaseButton } from '../base-button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type ColorPickerProps = {
  color: string;
  onColorChange: (color: string) => void;

  borderColor?: string;
  backgroundColor?: string;
  tooltip?: string;
  className?: string;

  children?: ReactNode;
  onClose?: (color: string) => void;
  suggestedColors?: string[];
};

export function ColorPicker(props: ColorPickerProps) {
  const {
    color,
    onColorChange,
    borderColor,
    backgroundColor,
    tooltip,
    className,

    children,
    onClose,

    suggestedColors = [],
  } = props;

  const handleColorChange = (color: string) => {
    // HACK: This is a workaround for a bug in tiptap
    // https://github.com/ueberdosis/tiptap/issues/3580
    //
    //     ERROR: flushSync was called from inside a lifecycle
    //
    // To fix this, we need to make sure that the onChange
    // callback is run after the current execution context.
    queueMicrotask(() => {
      onColorChange(color);
    });
  };

  const popoverButton = (
    <PopoverTrigger asChild>
      {children || (
        <BaseButton variant="ghost" className="!mly-size-7 mly-shrink-0" size="sm" type="button">
          <div
            className={cn('mly-h-4 mly-w-4 mly-shrink-0 mly-rounded mly-border-2 mly-border-gray-700', className)}
            style={{
              ...(borderColor ? { borderColor } : {}),
              backgroundColor: backgroundColor || 'transparent',
            }}
          />
        </BaseButton>
      )}
    </PopoverTrigger>
  );

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          onClose?.(color);
        }
      }}
    >
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{popoverButton}</TooltipTrigger>
          <TooltipContent sideOffset={8}>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        popoverButton
      )}

      <PopoverContent
        className="mly-w-full mly-rounded-none mly-border-0 !mly-bg-transparent !mly-p-0 mly-shadow-none mly-drop-shadow-md"
        sideOffset={8}
      >
        <div className="mly-min-w-[260px] mly-rounded-xl mly-border mly-border-gray-200 mly-bg-white mly-p-4">
          <HexColorPicker
            color={color}
            onChange={handleColorChange}
            className="mly-flex !mly-w-full mly-flex-col mly-gap-4"
          />
          <HexColorInput
            alpha={true}
            color={color}
            onChange={handleColorChange}
            className="mly-mt-4 mly-w-full mly-min-w-0 mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-px-2 mly-py-1.5 mly-text-sm mly-uppercase focus-visible:mly-border-gray-400 focus-visible:mly-outline-none"
            prefixed
          />

          {suggestedColors.length > 0 && (
            <div>
              <div className="-mly-mx-4 mly-my-4 mly-h-px mly-bg-gray-200" />

              <h2 className="mly-text-xs mly-text-gray-500">Recently used</h2>

              <div className="mly-mt-2 mly-flex mly-flex-wrap mly-gap-0.5">
                {suggestedColors.map((suggestedColor) => (
                  <BaseButton
                    key={suggestedColor}
                    variant="ghost"
                    size="sm"
                    className="!mly-size-7 mly-shrink-0"
                    type="button"
                    onClick={() => handleColorChange(suggestedColor)}
                  >
                    <div
                      className="mly-h-4 mly-w-4 mly-shrink-0 mly-rounded"
                      style={{
                        backgroundColor: suggestedColor,
                      }}
                    />
                  </BaseButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
