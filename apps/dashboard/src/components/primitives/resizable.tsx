import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import React, { useCallback, useMemo } from 'react';
import { Group, type GroupProps, type Layout, Panel, Separator, type SeparatorProps } from 'react-resizable-panels';

import { cn } from '@/utils/ui';

type ResizablePanelGroupProps = GroupProps & {
  autoSaveId?: string;
};

const ResizablePanelGroup = React.forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  ({ className, autoSaveId, onLayoutChanged, ...props }, ref) => {
    const defaultLayout = useMemo(() => {
      if (!autoSaveId) return undefined;
      try {
        const stored = localStorage.getItem(`resizable-panels:${autoSaveId}`);

        return stored ? (JSON.parse(stored) as Layout) : undefined;
      } catch {
        return undefined;
      }
    }, [autoSaveId]);

    const handleLayoutChanged = useCallback(
      (layout: Layout) => {
        if (autoSaveId) {
          try {
            localStorage.setItem(`resizable-panels:${autoSaveId}`, JSON.stringify(layout));
          } catch {
            // storage full or unavailable
          }
        }
        onLayoutChanged?.(layout);
      },
      [autoSaveId, onLayoutChanged]
    );

    return (
      <Group
        elementRef={ref}
        className={cn('flex h-full w-full', className)}
        defaultLayout={defaultLayout ?? props.defaultLayout}
        onLayoutChanged={handleLayoutChanged}
        {...props}
      />
    );
  }
);

const ResizablePanel = Panel;

const ResizableHandle = ({ withHandle, className, ...props }: SeparatorProps & { withHandle?: boolean }) => (
  <Separator
    className={cn(
      'group relative flex w-px items-center justify-center bg-neutral-200',
      'after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2',
      'hover:after:bg-transparent focus-visible:outline-hidden z-50',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-neutral-100 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <DragHandleDots2Icon className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
);

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

export type { Layout };
