import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { cn } from '@/utils/ui';

type StepEditorLayoutProps = {
  previewContextContent?: React.ReactNode;
  editorContent?: React.ReactNode;
  previewContent?: React.ReactNode;
  className?: string;
};

export function StepEditorLayout({
  previewContextContent,
  editorContent,
  previewContent,
  className,
}: StepEditorLayoutProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full">
          <div className="flex h-full flex-col border-r border-neutral-200">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">Preview Context</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {previewContextContent || (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Preview context content will go here
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="group relative w-px bg-transparent transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-neutral-300">
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </ResizableHandle>

        <ResizablePanel defaultSize={50} minSize={30} className="h-full">
          <div className="flex h-full flex-col border-r border-neutral-200">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">Editor</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {editorContent || (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Editor content will go here
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="group relative w-px bg-transparent transition-colors duration-200 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-neutral-300">
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </ResizableHandle>

        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full">
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-sm font-medium text-neutral-900">Preview</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {previewContent || (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Preview content will go here
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
