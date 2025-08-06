import { forwardRef, useCallback, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { LocalizationResourceEnum } from '@/types/translations';
import { EditorPanelSkeleton } from './editor-panel';
import { LocaleListSkeleton } from './locale-list';
import { TranslationDrawerContent, TranslationDrawerContentRef } from './translation-drawer-content';

function TranslationDrawerSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      {/* Header skeleton */}
      <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
        <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm font-medium">
          <Skeleton className="h-4 w-4" /> {/* Translate icon */}
          <Skeleton className="h-4 w-48" /> {/* Resource name */}
        </div>
      </header>

      {/* Main content skeleton */}
      <div className="flex h-full">
        <LocaleListSkeleton />
        <EditorPanelSkeleton />
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-end border-t border-neutral-200 bg-white px-6 py-3">
        <Skeleton className="h-8 w-24" /> {/* Save changes button */}
      </div>
    </div>
  );
}

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
              <TranslationDrawerSkeleton />
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
