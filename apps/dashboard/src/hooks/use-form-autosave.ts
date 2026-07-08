// useFormAutosave.ts

import { useCallback, useEffect, useRef } from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';
import { useDataRef } from '@/hooks/use-data-ref';
import { useDebounce } from '@/hooks/use-debounce';

const TEN_SECONDS = 10 * 1000;
const FIVE_HUNDRED_MS = 500;

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
  const lastSavedDataRef = useRef<string | null>(null);

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

      const serializedData = JSON.stringify(data);
      if (serializedData === lastSavedDataRef.current && !options?.forceSubmit) {
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
      lastSavedDataRef.current = serializedData;
      save(values, {
        onSuccess: () => {
          // Reset dirty state after successful save so polling hooks (e.g. useStepResolverPolling)
          // are not permanently blocked. We reset with the CURRENT form values (not the stale `values`
          // snapshot) to avoid overwriting edits the user made while the request was in-flight.
          // keepValues:true prevents regenerating useFieldArray field IDs (row flicker).
          const currentValues = formRef.current.getValues();
          formRef.current.reset(currentValues, { keepErrors: true, keepValues: true });
          options?.onSuccess?.();
        },
      });
    },
    [formRef, savePropsRef]
  );

  const debouncedOnSave = useDebounce(onSave, TEN_SECONDS);
  const shortDebouncedOnSave = useDebounce(onSave, FIVE_HUNDRED_MS);

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLFormElement, Element>) => {
      e.preventDefault();
      e.stopPropagation();

      const form = formRef.current;
      const values = form.getValues();

      // cancel the pending debounces for example on change events
      debouncedOnSave.cancel();
      shortDebouncedOnSave.cancel();
      onSave(values);
    },
    [formRef, onSave, debouncedOnSave, shortDebouncedOnSave]
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

  // Debounced save for field array mutations (append/remove).
  // Using a short debounce instead of saveForm() prevents the immediate
  // save → API response → values change → form.reset() cycle that regenerates
  // useFieldArray field IDs and causes row flicker.
  const saveFormDebounced = useCallback(() => {
    setTimeout(() => {
      const form = formRef.current;
      const values = form.getValues();
      shortDebouncedOnSave(values);
    }, 0);
  }, [formRef, shortDebouncedOnSave]);

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
    saveFormDebounced,
  };
}
