import { ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';

type ResizableLayoutProps = {
  children: ReactNode;
  className?: string;
  autoSaveId?: string;
  onLayoutChange?: (sizes: number[]) => void;
};

type PanelProps = {
  children: ReactNode;
  className?: string;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
};

function ContextPanel({ children, className, defaultSize = 25, minSize = 20, maxSize = 40 }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} maxSize={maxSize} className="h-full">
      <div className={cn('flex h-full flex-col border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function MainContentPanel({ children, className, defaultSize = 75, minSize = 60 }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full">
      <div className={cn('flex h-full flex-col', className)}>{children}</div>
    </ResizablePanel>
  );
}

function EditorPanel({ children, className, defaultSize = 50, minSize = 30 }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full">
      <div className={cn('flex h-full flex-col border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function PreviewPanel({ children, className, defaultSize = 50, minSize = 25 }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full">
      <div className={cn('flex h-full flex-col', className)}>{children}</div>
    </ResizablePanel>
  );
}

function StyledResizableHandle() {
  return <ResizableHandle withHandle={true} />;
}

export function ResizableLayout({ children, className, autoSaveId, onLayoutChange }: ResizableLayoutProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full" autoSaveId={autoSaveId} onLayout={onLayoutChange}>
        {children}
      </ResizablePanelGroup>
    </div>
  );
}

ResizableLayout.ContextPanel = ContextPanel;
ResizableLayout.MainContentPanel = MainContentPanel;
ResizableLayout.EditorPanel = EditorPanel;
ResizableLayout.PreviewPanel = PreviewPanel;
ResizableLayout.Handle = StyledResizableHandle;
