import { HexColorPicker } from 'react-colorful';
import { cn } from '../../utils/ui';
import { Input, InputPure } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  pureInput?: boolean;
}

export function ColorPicker({ value, onChange, className, pureInput = true }: ColorPickerProps) {
  const colorPickerPopover = (
    <Popover modal={true}>
      <PopoverTrigger>
        <div
          className={cn(
            'h-4 w-4 cursor-pointer rounded-full border shadow-sm transition-shadow hover:shadow-md',
            !pureInput && 'mx-2'
          )}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="min-w-0 p-3" align="end">
        <HexColorPicker color={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className={cn('flex items-center gap-2', pureInput ? 'gap-0.5' : 'gap-2', className)}>
      {pureInput ? (
        <>
          <InputPure
            type="text"
            className="text-foreground-600 h-5 w-[60px] py-1 text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {colorPickerPopover}
        </>
      ) : (
        <Input
          size="sm"
          type="text"
          className="text-foreground-600 w-[60px] py-1 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          trailingNode={colorPickerPopover}
        />
      )}
    </div>
  );
}
