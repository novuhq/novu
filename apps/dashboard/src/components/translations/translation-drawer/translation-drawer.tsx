import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { TranslationGroup } from '@/api/translations';
import { TranslationDrawerContent, TranslationDrawerContentRef } from './translation-drawer-content';
import { useState, useRef, useCallback } from 'react';

type TranslationDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  translationGroup: TranslationGroup | null;
  onTranslationGroupUpdated?: (resourceId: string) => void | Promise<void>;
};

export function TranslationDrawer({
  isOpen,
  onOpenChange,
  translationGroup,
  onTranslationGroupUpdated,
}: TranslationDrawerProps) {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const drawerContentRef = useRef<TranslationDrawerContentRef>(null);

  const handleCloseAttempt = useCallback(
    (event?: Event | KeyboardEvent) => {
      event?.preventDefault();

      if (drawerContentRef.current?.hasUnsavedChanges()) {
        setShowUnsavedDialog(true);
      } else {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedDialog(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[1100px] !max-w-none"
          onInteractOutside={handleCloseAttempt}
          onEscapeKeyDown={handleCloseAttempt}
        >
          <VisuallyHidden>
            <SheetTitle />
            <SheetDescription />
          </VisuallyHidden>
          {translationGroup ? (
            <TranslationDrawerContent
              key={`${translationGroup.resourceId}-${translationGroup.updatedAt}`}
              translationGroup={translationGroup}
              onTranslationGroupUpdated={onTranslationGroupUpdated}
              ref={drawerContentRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-neutral-500">No translation group selected</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <UnsavedChangesAlertDialog
        show={showUnsavedDialog}
        description="You have unsaved changes to the current translation. These changes will be lost if you close the drawer."
        onCancel={() => setShowUnsavedDialog(false)}
        onProceed={handleConfirmClose}
      />
    </>
  );
}
