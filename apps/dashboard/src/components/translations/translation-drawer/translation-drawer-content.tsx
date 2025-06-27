import { Button } from '@/components/primitives/button';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { TranslationGroup } from '@/api/translations';
import { TranslationHeader } from './translation-header';
import { LocaleList } from './locale-list';
import { EditorPanel } from './editor-panel';
import { useTranslationDrawerLogic } from './use-translation-drawer-logic';
import { forwardRef, useImperativeHandle, useState, useCallback } from 'react';

type TranslationDrawerContentProps = {
  translationGroup: TranslationGroup;
  onTranslationGroupUpdated?: (resourceId: string) => void | Promise<void>;
};

export interface TranslationDrawerContentRef {
  hasUnsavedChanges: () => boolean;
}

export const TranslationDrawerContent = forwardRef<TranslationDrawerContentRef, TranslationDrawerContentProps>(
  ({ translationGroup, onTranslationGroupUpdated }, ref) => {
    const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
    } = useTranslationDrawerLogic(translationGroup, onTranslationGroupUpdated);

    const canSave = selectedLocale && editor.modifiedContent && !saveTranslationMutation.isPending && !editor.jsonError;

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
          />

          <EditorPanel
            selectedLocale={selectedLocale}
            selectedTranslation={selectedTranslation}
            isLoadingTranslation={isLoadingTranslation}
            translationError={translationError}
            modifiedContent={editor.modifiedContent}
            jsonError={editor.jsonError}
            onContentChange={editor.handleContentChange}
            onDelete={handleDelete}
            resource={resource}
            onImportSuccess={() => onTranslationGroupUpdated?.(resource.resourceId)}
            isDeleting={deleteTranslationMutation.isPending}
          />
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 bg-white px-6 py-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
            isLoading={saveTranslationMutation.isPending}
          >
            Save changes
          </Button>
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
