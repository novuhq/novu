import { EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { TranslationGroup } from '@/api/translations';
import { InlineToast } from '@/components/primitives/inline-toast';
import { PermissionButton } from '@/components/primitives/permission-button';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { EditorPanel } from './editor-panel';
import { LocaleList } from './locale-list';
import { TranslationHeader } from './translation-header';
import { useTranslationDrawerLogic } from './use-translation-drawer-logic';

export type TranslationDrawerContentRef = {
  hasUnsavedChanges: () => boolean;
};

type TranslationDrawerContentProps = {
  translationGroup: TranslationGroup;
  initialLocale?: string;
  onLocaleChange?: (locale: string) => void;
};

export const TranslationDrawerContent = forwardRef<TranslationDrawerContentRef, TranslationDrawerContentProps>(
  ({ translationGroup, initialLocale, onLocaleChange }, ref) => {
    const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const has = useHasPermission();
    const { currentEnvironment } = useEnvironment();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
    const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
    const isReadOnly = !canWrite || !isDevEnvironment;

    const {
      selectedLocale,
      selectedTranslation,
      isLoadingTranslation,
      translationError,
      editor,
      saveTranslationMutation,
      handleLocaleSelect,
      handleSave,
    } = useTranslationDrawerLogic(translationGroup, initialLocale, onLocaleChange);

    const canSave =
      canWrite &&
      isDevEnvironment &&
      selectedLocale &&
      editor.modifiedContent &&
      !saveTranslationMutation.isPending &&
      !editor.jsonError;

    const checkUnsavedChanges = useCallback(
      (action: () => void) => {
        if (editor.hasUnsavedChanges) {
          setPendingAction(() => action);
          setIsUnsavedChangesDialogOpen(true);
        } else {
          action();
        }
      },
      [editor.hasUnsavedChanges]
    );

    const handleDiscardChanges = useCallback(() => {
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      setIsUnsavedChangesDialogOpen(false);
    }, [pendingAction]);

    const handleCancelChange = useCallback(() => {
      setPendingAction(null);
      setIsUnsavedChangesDialogOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({
      hasUnsavedChanges: () => editor.hasUnsavedChanges,
    }));

    return (
      <div className="flex h-full w-full flex-col">
        <TranslationHeader resourceName={translationGroup.resourceName} />

        {!isDevEnvironment && (
          <div className="border-b border-neutral-200 px-6 py-3">
            <InlineToast
              variant="warning"
              title="View-only mode"
              description="Edit translations in your development environment."
            />
          </div>
        )}

        <div className="flex h-full">
          <LocaleList
            locales={translationGroup.locales}
            selectedLocale={selectedLocale}
            onLocaleSelect={handleLocaleSelect}
            updatedAt={translationGroup.updatedAt}
            hasUnsavedChanges={editor.hasUnsavedChanges}
            onUnsavedChangesCheck={checkUnsavedChanges}
            outdatedLocales={translationGroup.outdatedLocales}
          />

          <EditorPanel
            selectedTranslation={selectedTranslation}
            isLoadingTranslation={isLoadingTranslation}
            translationError={translationError}
            modifiedContentString={editor.modifiedContentString}
            jsonError={editor.jsonError}
            onContentChange={editor.handleContentChange}
            outdatedLocales={translationGroup.outdatedLocales}
            isReadOnly={isReadOnly}
          />
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 bg-white px-6 py-3">
          <PermissionButton
            permission={PermissionsEnum.WORKFLOW_WRITE}
            variant="secondary"
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
            isLoading={saveTranslationMutation.isPending}
          >
            Save changes
          </PermissionButton>
        </div>

        <UnsavedChangesAlertDialog
          show={isUnsavedChangesDialogOpen}
          description="You have unsaved changes to the current translation. These changes will be lost if you continue."
          onCancel={handleCancelChange}
          onProceed={handleDiscardChanges}
        />
      </div>
    );
  }
);
