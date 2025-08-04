import { ContentIssueEnum, EmailControlsDto, EnvironmentTypeEnum, RuntimeIssue } from '@novu/shared';
import { useState } from 'react';
import { RiArrowRightSLine, RiCodeBlock, RiEdit2Line, RiEyeLine, RiLockLine, RiSettings4Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { IssuesPanel } from '../issues-panel';
import { Button } from '../primitives/button';
import { CompactButton } from '../primitives/button-compact';
import { Form, FormRoot } from '../primitives/form/form';
import { PanelHeader } from '../workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '../workflow-editor/steps/layout/resizable-layout';
import { LayoutEditorFactory } from './layout-editor-factory';
import { useLayoutEditor } from './layout-editor-provider';
import { LayoutEditorSettingsDrawer } from './layout-editor-settings-drawer';
import { LayoutPreviewContextPanel } from './layout-preview-context-panel';
import { LayoutPreviewFactory } from './layout-preview-factory';

export const LayoutEditor = () => {
  const navigate = useNavigate();
  const { currentEnvironment, oppositeEnvironment } = useEnvironment();
  const { form, layout, isPreviewPending, isPending, updateLayout, isUpdating } = useLayoutEditor();
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

  const issues = {
    controls: Object.entries(form.formState.errors).reduce(
      (acc, [key, value]) => {
        acc[key] = [{ message: value?.message ?? '', issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE }];
        return acc;
      },
      {} as Record<string, RuntimeIssue[]>
    ),
  };

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

  const handleSwitchToDevelopment = () => {
    const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

    if (developmentEnvironment?.slug) {
      navigate(
        buildRoute(ROUTES.LAYOUTS_EDIT, {
          environmentSlug: developmentEnvironment.slug ?? '',
          layoutSlug: layout?.layoutId ?? '',
        })
      );
    }
  };

  const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

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
                        {currentEnvironment?.type === EnvironmentTypeEnum.DEV ? (
                          <LayoutEditorFactory />
                        ) : (
                          <div className="flex h-full items-center justify-center p-6">
                            <div className="max-w-md space-y-4 text-center">
                              <div className="flex justify-center">
                                <div className="bg-neutral-alpha-50 rounded-full p-3">
                                  <RiLockLine className="text-neutral-alpha-400 h-8 w-8" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-base font-medium text-neutral-600">Step editor unavailable</h3>
                                <p className="text-sm leading-relaxed text-neutral-500">
                                  Step editing is only available in development environments. Switch to a development
                                  environment to modify this step.
                                </p>
                              </div>
                              {developmentEnvironment && (
                                <div className="flex justify-center pt-2">
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    mode="gradient"
                                    onClick={handleSwitchToDevelopment}
                                    trailingIcon={RiArrowRightSLine}
                                  >
                                    Switch to {developmentEnvironment.name}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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

              <IssuesPanel issues={issues}>
                <div className="ml-auto">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={
                      !form.formState.isDirty ||
                      isPending ||
                      isUpdating ||
                      currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    }
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
