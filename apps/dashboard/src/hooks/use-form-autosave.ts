import { useCallback, useRef } from 'react';
import { FieldValues, SubmitHandler, UseFormReturn, useWatch } from 'react-hook-form';
import debounce from 'debounce';
import useDeepCompareEffect from 'use-deep-compare-effect';

export const useFormAutoSave = <T extends FieldValues>({
  onSubmit,
  form,
}: {
  onSubmit: SubmitHandler<T>;
  form: UseFormReturn<T>;
}) => {
  const onSubmitRef = useRef<SubmitHandler<T>>(onSubmit);
  onSubmitRef.current = onSubmit;
  const { formState, control, handleSubmit } = form;

  const watchedData = useWatch<T>({
    control,
  });

  const debouncedSave = useCallback<() => void>(
    debounce(() => {
      handleSubmit(onSubmitRef.current)();
    }, 1000),
    [handleSubmit]
  );

  useDeepCompareEffect(() => {
    if (formState.isDirty) {
      debouncedSave();
    }
  }, [watchedData]);
};
