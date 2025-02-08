// useFormAutosave.ts
import { useDataRef } from '@/hooks/use-data-ref';
import { useDebounce } from '@/hooks/use-debounce';
import { useCallback, useEffect } from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';

const TEN_SECONDS = 10 * 1000;

export function useFormAutosave<U extends Record<string, unknown>, T extends FieldValues = FieldValues>({
  previousData,
  form: propsForm,
  isReadOnly,
  shouldClientValidate = false,
  save,
}: {
  previousData: U;
  form: UseFormReturn<T>;
  isReadOnly?: boolean;
  shouldClientValidate?: boolean;
  save: (data: U) => void;
}) {
  const formRef = useDataRef(propsForm);

  const onSave = useCallback(
    async (data: T, options?: { forceSubmit?: boolean }) => {
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
      save(values);
    },
    [formRef, previousData, isReadOnly, save, shouldClientValidate]
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
  const saveForm = (forceSubmit: boolean = false): Promise<void> => {
    return new Promise((resolve) => {
      // await for the state to be updated
      setTimeout(async () => {
        // use the form reference instead of destructuring the props to avoid stale closures
        const form = formRef.current;
        const values = form.getValues();
        await onSave(values, { forceSubmit });

        resolve();
      }, 0);
    });
  };

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
