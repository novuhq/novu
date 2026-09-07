import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiSettings4Line } from 'react-icons/ri';
import { CompactButton } from '@/components/primitives/button-compact';
import { Skeleton } from '@/components/primitives/skeleton';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';

export const LayoutEditorSkeleton = () => {
  return (
    <div className="flex h-full w-full">
      <ResizableLayout autoSaveId="layout-editor-page-layout">
        <ResizableLayout.ContextPanel>
          <PanelHeader icon={RiCodeBlock} title="Preview sandbox" className="p-3" />
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
                <div className="flex items-center justify-between">
                  <PanelHeader icon={() => <RiEdit2Line />} title="Layout Editor" className="flex-1">
                    <CompactButton
                      size="md"
                      variant="ghost"
                      type="button"
                      icon={RiSettings4Line}
                      className="[&>svg]:size-4"
                    />
                  </PanelHeader>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="h-full p-3">
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
              </ResizableLayout.EditorPanel>

              <ResizableLayout.Handle />

              <ResizableLayout.PreviewPanel>
                <PanelHeader icon={RiEyeLine} title="Preview" isLoading />
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
};
