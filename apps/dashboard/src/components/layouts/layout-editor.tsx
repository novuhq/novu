import { EnvironmentTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { RiArrowRightSLine, RiCodeBlock, RiEdit2Line, RiEyeLine, RiLockLine, RiSettings4Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';
import { LocalizationResourceEnum } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useFetchTranslationGroup } from '../../hooks/use-fetch-translation-group';
import { IssuesPanel } from '../issues-panel';
import { Button } from '../primitives/button';
import { CompactButton } from '../primitives/button-compact';
import { LocaleSelect } from '../primitives/locale-select';
import { PanelHeader } from '../workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '../workflow-editor/steps/layout/resizable-layout';
import { TranslationStatus } from '../workflow-editor/translation-status';
import { LayoutEditorFactory } from './layout-editor-factory';
import { useLayoutEditor } from './layout-editor-provider';
import { LayoutEditorSettingsDrawer } from './layout-editor-settings-drawer';
import { LayoutPreviewContextPanel } from './layout-preview-context-panel';
import { LayoutPreviewFactory } from './layout-preview-factory';

export const LayoutEditor = () => {
  const navigate = useNavigate();
  const { currentEnvironment, oppositeEnvironment } = useEnvironment();
  const { layout, isPreviewPending, isPending, hasUnsavedChanges, isUpdating, selectedLocale, issues, onLocaleChange } =
    useLayoutEditor();
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const isTranslationsEnabled = useIsTranslationEnabled({
    isTranslationEnabledOnResource: layout?.isTranslationEnabled ?? false,
  });

  // Fetch translation group to get outdated locales status
  const { data: translationGroup } = useFetchTranslationGroup({
    resourceId: layout?.layoutId ?? '',
    resourceType: LocalizationResourceEnum.LAYOUT,
    enabled: isTranslationsEnabled,
  });

  // Extract available locales from translations
  const availableLocales = translationGroup?.locales || [];

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
      <ResizableLayout autoSaveId="layout-editor-page-layout">
        <ResizableLayout.ContextPanel>
          <PanelHeader icon={RiCodeBlock} title="Preview sandbox" className="p-3" />
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
                    <TranslationStatus
                      resourceId={layout?.layoutId ?? ''}
                      resourceType={LocalizationResourceEnum.LAYOUT}
                      isTranslationEnabled={isTranslationsEnabled}
                      className="h-7 text-xs"
                    />
                    <CompactButton
                      size="md"
                      variant="ghost"
                      type="button"
                      icon={RiSettings4Line}
                      onClick={() => setIsSettingsDrawerOpen(true)}
                      className="ml-2 [&>svg]:size-4"
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
                <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isPreviewPending}>
                  {isTranslationsEnabled && availableLocales.length > 0 && (
                    <LocaleSelect
                      value={selectedLocale}
                      onChange={onLocaleChange}
                      placeholder="Select locale"
                      availableLocales={availableLocales}
                      className="h-7 w-auto min-w-[120px] text-xs"
                    />
                  )}
                </PanelHeader>
                <div className="flex-1 overflow-hidden">
                  <div
                    className="bg-bg-weak relative h-full overflow-y-auto p-3"
                    style={{
                      backgroundImage: 'radial-gradient(circle, hsl(var(--neutral-alpha-100)) 1px, transparent 1px)',
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
                  !hasUnsavedChanges || isPending || isUpdating || currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                }
                isLoading={isUpdating}
              >
                Save changes
              </Button>
            </div>
          </IssuesPanel>
        </ResizableLayout.MainContentPanel>
      </ResizableLayout>

      <LayoutEditorSettingsDrawer isOpen={isSettingsDrawerOpen} onOpenChange={setIsSettingsDrawerOpen} />
    </div>
  );
};
