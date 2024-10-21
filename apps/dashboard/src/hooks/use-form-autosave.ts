import { FieldValues, SubmitHandler, UseFormReturn, useWatch } from 'react-hook-form';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useDebounce } from './use-debounce';
import { useDataRef } from './use-data-ref';

export const useFormAutoSave = <T extends FieldValues>({
  onSubmit,
  form,
}: {
  onSubmit: SubmitHandler<T>;
  form: UseFormReturn<T>;
}) => {
  const onSubmitRef = useDataRef(onSubmit);
  const { formState, control, handleSubmit } = form;

  const watchedData = useWatch<T>({
    control,
  });

  const debouncedSave = useDebounce(() => {
    handleSubmit(onSubmitRef.current)();
  }, 500);

  useDeepCompareEffect(() => {
    if (formState.isDirty) {
      debouncedSave();
    }
  }, [watchedData]);
};
