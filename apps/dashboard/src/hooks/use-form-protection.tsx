import { useCallback, useMemo, useState } from 'react';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useFindDirtyForm } from './use-find-dirty-form';

type UseFormProtectionProps<T> = {
  onValueChange: (value: T) => void;
};

export function useFormProtection<T>(props: UseFormProtectionProps<T>) {
  const { onValueChange } = props;
  const [showAlert, setShowAlert] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ value: T } | null>(null);
  const { isDirty, ref } = useFindDirtyForm();

  useBeforeUnload(isDirty);

  const protectedOnValueChange = useCallback(
    (value: T) => {
      if (isDirty) {
        setShowAlert(true);
        setPendingChange({ value });
      } else {
        onValueChange(value);
      }
    },
    [isDirty, onValueChange]
  );

  const ProtectionAlert = useMemo(
    () => (
      <UnsavedChangesAlertDialog
        show={showAlert}
        onCancel={() => {
          setShowAlert(false);
          setPendingChange(null);
        }}
        onProceed={() => {
          setShowAlert(false);
        }}
        onExitComplete={() => {
          if (pendingChange) {
            onValueChange(pendingChange.value);
          }
          setPendingChange(null);
        }}
      />
    ),
    [onValueChange, pendingChange, showAlert]
  );

  return { isDirty, protectedOnValueChange, ProtectionAlert, ref };
}
