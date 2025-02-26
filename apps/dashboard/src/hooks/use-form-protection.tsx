import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useCallback, useState } from 'react';
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

  const ProtectionAlert = () => (
    <UnsavedChangesAlertDialog
      show={showAlert}
      onCancel={() => {
        setShowAlert(false);
        setPendingChange(null);
      }}
      onProceed={() => {
        if (pendingChange) {
          onValueChange(pendingChange.value);
        }

        setShowAlert(false);
        setPendingChange(null);
      }}
    />
  );

  return { isDirty, protectedOnValueChange, ProtectionAlert, ref };
}
