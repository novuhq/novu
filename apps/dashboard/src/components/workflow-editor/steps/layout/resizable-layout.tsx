import { ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';

type ResizableLayoutProps = {
  children: ReactNode;
  className?: string;
};

type PanelProps = {
  children: ReactNode;
  className?: string;
};

function ContextPanel({ children, className }: PanelProps) {
  return (
    <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full">
      <div className={cn('flex h-full flex-col border-r border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function MainContentPanel({ children, className }: PanelProps) {
  return (
    <ResizablePanel defaultSize={75} minSize={60} className="h-full">
      <div className={cn('flex h-full flex-col', className)}>{children}</div>
    </ResizablePanel>
  );
}

function EditorPanel({ children, className }: PanelProps) {
  return (
    <ResizablePanel defaultSize={50} minSize={30} className="h-full">
      <div className={cn('flex h-full flex-col border-r border-neutral-200', className)}>{children}</div>
    </ResizablePanel>
  );
}

function PreviewPanel({ children, className }: PanelProps) {
  return (
    <ResizablePanel defaultSize={50} minSize={25} className="h-full">
      <div className={cn('flex h-full flex-col', className)}>{children}</div>
    </ResizablePanel>
  );
}

function StyledResizableHandle() {
  return (
    <ResizableHandle className="group relative w-px bg-transparent transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-neutral-300">
      <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </ResizableHandle>
  );
}

export function ResizableLayout({ children, className }: ResizableLayoutProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
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
