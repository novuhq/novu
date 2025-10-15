// useFormAutosave.ts

import { useCallback, useEffect } from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';
import { useDataRef } from '@/hooks/use-data-ref';
import { useDebounce } from '@/hooks/use-debounce';

const TEN_SECONDS = 10 * 1000;

type UseFormAutosaveProps<U extends Record<string, unknown>, T extends FieldValues = FieldValues> = {
  previousData: U;
  form: UseFormReturn<T>;
  isReadOnly?: boolean;
  shouldClientValidate?: boolean;
  save: (data: U, options: { onSuccess?: () => void }) => void;
};

export function useFormAutosave<U extends Record<string, unknown>, T extends FieldValues = FieldValues>({
  form: propsForm,
  ...saveProps
}: UseFormAutosaveProps<U, T>) {
  const formRef = useDataRef(propsForm);
  const savePropsRef = useDataRef({ ...saveProps });

  const onSave = useCallback(
    async (data: T, options?: { forceSubmit?: boolean; onSuccess?: () => void }) => {
      const { save, isReadOnly, shouldClientValidate, previousData } = savePropsRef.current;
      if (isReadOnly) {
        return;
      }

      // use the form reference instead of destructuring the props to avoid stale closures
      const form = formRef.current;
      const dirtyFields = form.formState.dirtyFields;
      // somehow the form isDirty flag is lost on first blur that why we fallback to dirtyFields
      const isDirty = form.formState.isDirty || Object.keys(dirtyFields).length > 0;

      if (!isDirty && !options?.forceSubmit) {
        return;
      }

      // manually trigger the validation of the form
      if (shouldClientValidate) {
        const isValid = await form.trigger();

        if (!isValid) {
          return;
        }
      }

      const values = { ...previousData, ...data };
      // reset the dirty fields right away because on slow networks the patch request might take a while
      // so other blur/change events might trigger in the meantime
      // we also send the invalid values to api and should keep the errors in the form
      form.reset(values, { keepErrors: true });
      save(values, { onSuccess: options?.onSuccess });
    },
    [formRef, savePropsRef]
  );

  const debouncedOnSave = useDebounce(onSave, TEN_SECONDS);

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLFormElement, Element>) => {
      e.preventDefault();
      e.stopPropagation();

      const form = formRef.current;
      const values = form.getValues();

      // cancel the pending debounces for example on change events
      debouncedOnSave.cancel();
      onSave(values);
    },
    [formRef, onSave, debouncedOnSave]
  );

  // flush the form updates right away
  const saveForm = useCallback(
    ({ forceSubmit = false, onSuccess }: { forceSubmit?: boolean; onSuccess?: () => void } = {}): Promise<void> => {
      return new Promise((resolve) => {
        // await for the state to be updated
        setTimeout(async () => {
          // use the form reference instead of destructuring the props to avoid stale closures
          const form = formRef.current;
          const values = form.getValues();
          await onSave(values, { forceSubmit, onSuccess });

          resolve();
        }, 0);
      });
    },
    [formRef, onSave]
  );

  useEffect(() => {
    const form = formRef.current;

    const { unsubscribe } = form.watch((partial) => {
      const values = form.getValues();
      debouncedOnSave({ ...values, ...partial });
    });

    return () => unsubscribe();
  }, [formRef, debouncedOnSave]);

  return {
    onBlur,
    saveForm,
  };
}
