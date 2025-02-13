import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useCallback, useState } from 'react';

type UseFormDialogProtectionProps = {
  onOpenChange?: (open: boolean) => void; // for drawers/sheets
};
export function useFormDialogProtection(props: UseFormDialogProtectionProps) {
  const { onOpenChange } = props;
  const [isDirty, setIsDirty] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useBeforeUnload(isDirty);

  const setRef = useCallback((element: HTMLElement | null) => {
    if (element) {
      setupElementObserver(element);
    }
  }, []);

  function setupElementObserver(element: HTMLElement) {
    const checkDirty = () => {
      const dirtyFound = element.querySelector('[data-dirty="true"]') !== null;
      setIsDirty(dirtyFound);
    };

    checkDirty();

    const observer = new MutationObserver((mutations) => {
      const shouldCheck = mutations.some((mutation) => mutation.type === 'attributes' || mutation.type === 'childList');

      if (shouldCheck) {
        checkDirty();
      }
    });

    observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }

  const protectedOnOpenChange = (open: boolean) => {
    if (isDirty) {
      setShowAlert(true);
    } else {
      onOpenChange?.(open);
    }
  };

  const ProtectionAlert = useCallback(
    () => (
      <UnsavedChangesAlertDialog
        show={showAlert}
        onCancel={() => {
          setShowAlert(false);
        }}
        onProceed={() => {
          setShowAlert(false);
          onOpenChange?.(false);
        }}
      />
    ),
    [onOpenChange, showAlert, setShowAlert]
  );

  return { isDirty, protectedOnOpenChange, ProtectionAlert, ref: setRef };
}
