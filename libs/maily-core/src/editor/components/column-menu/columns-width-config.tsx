import { Columns2, Columns3, SlidersVertical } from 'lucide-react';
import { cn } from '@/editor/utils/classname';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';

type ColumnsWidthConfigProps = {
  columnsCount: number;
  onColumnsCountChange: (columns: number) => void;

  columnWidths: string[];
  onColumnWidthChange?: (column: number, width: string) => void;
};

export function ColumnsWidthConfig(props: ColumnsWidthConfigProps) {
  const { columnsCount = 2, onColumnsCountChange, columnWidths, onColumnWidthChange } = props;

  return (
    <Popover>
      <PopoverTrigger className="mly-flex mly-size-7 mly-items-center mly-justify-center mly-gap-1 mly-rounded-md mly-text-sm data-[state=open]:mly-bg-soft-gray hover:mly-bg-soft-gray">
        <SlidersVertical className="mly-h-3 mly-w-3 mly-stroke-[2.5]" />
      </PopoverTrigger>
      <PopoverContent
        className="mly-w-[300px] mly-rounded-lg !mly-p-0.5"
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
        <div className="mly-grid mly-grid-cols-2 mly-gap-1">
          <SwitchButton onClick={() => onColumnsCountChange(2)} isActive={columnsCount === 2}>
            <Columns2 className="mly-h-4 mly-w-4 mly-stroke-[2.5]" />
            <span>2 Columns</span>
          </SwitchButton>
          <SwitchButton onClick={() => onColumnsCountChange(3)} isActive={columnsCount === 3}>
            <Columns3 className="mly-h-4 mly-w-4 mly-stroke-[2.5]" />
            <span>3 Columns</span>
          </SwitchButton>
        </div>

        <hr className="mly-my-0.5 mly-border-gray-200" />

        <div className="mly-grid mly-gap-1 mly-p-1" style={{ gridTemplateColumns: `repeat(${columnsCount}, 1fr)` }}>
          {Array.from({ length: columnsCount }).map((_, index) => {
            const value = columnWidths[index] === 'auto' ? '' : columnWidths[index];
            const label =
              columnsCount === 2
                ? index === 0
                  ? 'Left'
                  : 'Right'
                : index === 0
                  ? 'Left'
                  : index === 1
                    ? 'Middle'
                    : 'Right';

            return (
              <div className="mly-flex mly-flex-col mly-gap-1" key={index}>
                <span className="mly-text-xs mly-text-gray-400">{label}</span>

                <label className="mly-relative">
                  <input
                    {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
                    placeholder="auto"
                    min={1}
                    max={90}
                    type="number"
                    className="hide-number-controls mly-w-full mly-appearance-none mly-rounded-md mly-bg-soft-gray mly-px-1.5 mly-py-1 mly-pr-6 mly-text-sm mly-tabular-nums mly-outline-none focus:mly-bg-soft-gray focus:mly-outline-none focus:mly-ring-1 focus:mly-ring-midnight-gray/50"
                    value={value}
                    onChange={(e) => {
                      const value = e.target.value;
                      onColumnWidthChange?.(index, value);
                    }}
                  />
                  <span className="mly-absolute mly-inset-y-0 mly-right-0 mly-flex mly-aspect-square mly-items-center mly-justify-center mly-text-xs mly-tabular-nums mly-text-gray-500">
                    %
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SwitchButtonProps = {
  isActive?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

function SwitchButton(props: SwitchButtonProps) {
  const { onClick, isActive = false, children } = props;

  return (
    <button
      className={cn(
        'mly-flex mly-h-7 mly-items-center mly-gap-1 mly-rounded-md mly-px-2 mly-text-sm mly-text-gray-500 hover:mly-bg-soft-gray hover:mly-text-midnight-gray',
        isActive && 'mly-bg-soft-gray mly-text-midnight-gray'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
