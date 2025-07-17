import { useState } from 'react';
import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiSettings4Line } from 'react-icons/ri';
import { EmailControlsDto } from '@novu/shared';

import { useLayoutEditor } from './layout-editor-provider';
import { Form, FormRoot } from '../primitives/form/form';
import { ResizableLayout } from '../workflow-editor/steps/layout/resizable-layout';
import { PanelHeader } from '../workflow-editor/steps/layout/panel-header';
import { LayoutPreviewContextPanel } from './layout-preview-context-panel';
import { IssuesPanel } from '../issues-panel';
import { Button } from '../primitives/button';
import { LayoutEditorSettingsDrawer } from './layout-editor-settings-drawer';
import { CompactButton } from '../primitives/button-compact';
import { LayoutEditorFactory } from './layout-editor-factory';
import { LayoutPreviewFactory } from './layout-preview-factory';

export const LayoutEditor = () => {
  const { form, layout, isPreviewPending, isPending, updateLayout, isUpdating } = useLayoutEditor();
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

  const onSubmit = (formData: Record<string, unknown>) => {
    updateLayout({
      layout: {
        name: layout?.name ?? '',
        controlValues: {
          email: {
            ...(formData as EmailControlsDto),
          },
        },
      },
      layoutSlug: layout?.slug ?? '',
    });
  };

  return (
    <div className="flex h-full w-full">
      <Form {...form}>
        <FormRoot
          id="edit-layout"
          autoComplete="off"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full w-full flex-col"
        >
          <ResizableLayout autoSaveId="layout-editor-page-layout">
            <ResizableLayout.ContextPanel>
              <PanelHeader icon={RiCodeBlock} title="Preview Context" className="p-3" />
              <div className="bg-bg-weak flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <LayoutPreviewContextPanel />
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
                          onClick={() => setIsSettingsDrawerOpen(true)}
                          className="[&>svg]:size-4"
                        />
                      </PanelHeader>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <div className="h-full p-3">
                        <LayoutEditorFactory />
                      </div>
                    </div>
                  </ResizableLayout.EditorPanel>

                  <ResizableLayout.Handle />

                  <ResizableLayout.PreviewPanel>
                    <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isPreviewPending} />
                    <div className="flex-1 overflow-hidden">
                      <div
                        className="bg-bg-weak relative h-full overflow-y-auto p-3"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle, hsl(var(--neutral-alpha-100)) 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      >
                        <LayoutPreviewFactory />
                      </div>
                    </div>
                  </ResizableLayout.PreviewPanel>
                </ResizableLayout>
              </div>

              <IssuesPanel issues={layout?.issues}>
                <div className="ml-auto">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!form.formState.isDirty || isPending || isUpdating}
                    isLoading={isUpdating}
                  >
                    Save changes
                  </Button>
                </div>
              </IssuesPanel>
            </ResizableLayout.MainContentPanel>
          </ResizableLayout>
        </FormRoot>
      </Form>

      <LayoutEditorSettingsDrawer isOpen={isSettingsDrawerOpen} onOpenChange={setIsSettingsDrawerOpen} />
    </div>
  );
};
