import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { TranslationDrawerContent, TranslationDrawerContentRef } from './translation-drawer-content';
import { useState, useRef, useCallback, forwardRef } from 'react';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { LocalizationResourceEnum } from '@/types/translations';

type TranslationDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  resourceType: LocalizationResourceEnum;
  resourceId: string;
  initialLocale?: string;
  onLocaleChange?: (locale: string) => void;
};

export const TranslationDrawer = forwardRef<HTMLDivElement, TranslationDrawerProps>(
  ({ isOpen, onOpenChange, resourceType, resourceId, initialLocale, onLocaleChange }, ref) => {
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const drawerContentRef = useRef<TranslationDrawerContentRef>(null);

    // Fetch translation group
    const { data: translationGroup, isPending } = useFetchTranslationGroup({
      resourceId,
      resourceType,
    });

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
      <div ref={ref}>
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
            {isPending ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-500">Loading translation group...</p>
              </div>
            ) : translationGroup && translationGroup.locales ? (
              <TranslationDrawerContent
                key={translationGroup.resourceId}
                translationGroup={translationGroup}
                initialLocale={initialLocale}
                onLocaleChange={onLocaleChange}
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
      </div>
    );
  }
);
