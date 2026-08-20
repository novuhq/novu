import { RiCodeBlock, RiEdit2Line, RiEyeLine } from 'react-icons/ri';
import { Skeleton } from '@/components/primitives/skeleton';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';

export function StepEditorSkeleton() {
  return (
    <div className="h-full w-full">
      <ResizableLayout autoSaveId="step-editor-main-layout">
        <ResizableLayout.ContextPanel defaultSize="27%" minSize="27%" maxSize="80%">
          <PanelHeader icon={RiCodeBlock} title="Preview sandbox" className="py-2" />
          <div className="bg-bg-weak flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-3">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        </ResizableLayout.ContextPanel>

        <ResizableLayout.Handle />

        <ResizableLayout.MainContentPanel>
          <div className="flex min-h-0 flex-1 flex-col">
            <ResizableLayout autoSaveId="step-editor-content-layout">
              <ResizableLayout.EditorPanel>
                <PanelHeader icon={() => <RiEdit2Line />} title="Editor" className="min-h-[45px] py-2" />
                <div className="flex-1 overflow-y-auto">
                  <div className="h-full p-3">
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
              </ResizableLayout.EditorPanel>

              <ResizableLayout.Handle />

              <ResizableLayout.PreviewPanel>
                <PanelHeader icon={RiEyeLine} title="Preview" isLoading className="min-h-[45px] py-2" />
                <div className="flex-1 overflow-hidden">
                  <div
                    className="bg-bg-weak relative h-full overflow-y-auto p-3"
                    style={{
                      backgroundImage: 'radial-gradient(circle, hsl(var(--neutral-alpha-100)) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  >
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
              </ResizableLayout.PreviewPanel>
            </ResizableLayout>
          </div>
        </ResizableLayout.MainContentPanel>
      </ResizableLayout>
    </div>
  );
}
