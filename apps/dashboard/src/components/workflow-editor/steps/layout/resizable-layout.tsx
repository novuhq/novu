/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { ReactNode } from 'react';
import { type Layout, ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';

type ResizableLayoutProps = {
  children: ReactNode;
  className?: string;
  autoSaveId?: string;
  onLayoutChange?: (layout: Layout) => void;
};

type PanelProps = {
  children: ReactNode;
  className?: string;
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;
};

function ContextPanel({ children, className, defaultSize = '20%', minSize = '20%', maxSize = '40%' }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} maxSize={maxSize} className="h-full" id="context-panel">
      <div className={cn('flex h-full flex-col border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function MainContentPanel({ children, className, defaultSize = '75%', minSize = '60%' }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full" id="main-content-panel">
      <div className={cn('flex h-full flex-col', className)}>{children}</div>
    </ResizablePanel>
  );
}

function EditorPanel({ children, className, defaultSize = '50%', minSize = '30%' }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full" id="editor-panel">
      <div className={cn('flex h-full flex-col border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function PreviewPanel({ children, className, defaultSize = '50%', minSize = '25%' }: PanelProps) {
  return (
    <ResizablePanel defaultSize={defaultSize} minSize={minSize} className="h-full" id="preview-panel">
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
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full"
        autoSaveId={autoSaveId}
        onLayoutChanged={onLayoutChange}
      >
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
