import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { TranslationGroup } from '@/api/translations';
import { TranslationHeader } from './translation-header';
import { LocaleList } from './locale-list';
import { EditorPanel } from './editor-panel';
import { useTranslationDrawerLogic } from './use-translation-drawer-logic';
import { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { useHasPermission } from '@/hooks/use-has-permission';
import { PermissionsEnum } from '@novu/shared';
import { PermissionButton } from '@/components/primitives/permission-button';

type TranslationDrawerContentProps = {
  translationGroup: TranslationGroup;
  initialLocale?: string;
  onLocaleChange?: (locale: string) => void;
};

export interface TranslationDrawerContentRef {
  hasUnsavedChanges: () => boolean;
}

export const TranslationDrawerContent = forwardRef<TranslationDrawerContentRef, TranslationDrawerContentProps>(
  ({ translationGroup, initialLocale, onLocaleChange }, ref) => {
    const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const has = useHasPermission();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });

    const {
      selectedLocale,
      selectedTranslation,
      isLoadingTranslation,
      translationError,
      resource,
      editor,
      saveTranslationMutation,
      deleteTranslationMutation,
      handleLocaleSelect,
      handleSave,
      handleDelete,
    } = useTranslationDrawerLogic(translationGroup, initialLocale, onLocaleChange);

    const canSave =
      canWrite && selectedLocale && editor.modifiedContent && !saveTranslationMutation.isPending && !editor.jsonError;

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
            modifiedContent={editor.modifiedContent}
            jsonError={editor.jsonError}
            onContentChange={editor.handleContentChange}
            onDelete={handleDelete}
            isDeleting={deleteTranslationMutation.isPending}
            outdatedLocales={translationGroup.outdatedLocales}
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

TranslationDrawerContent.displayName = 'TranslationDrawerContent';
