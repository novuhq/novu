import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataRef } from './use-data-ref';

type PreviewContextState<D, E extends Record<keyof D, string | null>> = {
  accordionValue: string[];
  openSteps: Record<string, boolean>;
  errors: E;
  localParsedData: D;
};

const getDefaultState = <D, E extends Record<keyof D, string | null>>(
  defaultAccordionValue: string[],
  defaultErrors: E
): Omit<PreviewContextState<D, E>, 'localParsedData'> => ({
  accordionValue: defaultAccordionValue,
  openSteps: {},
  errors: defaultErrors,
});

export function usePreviewContext<D, E extends Record<keyof D, string | null>>({
  value,
  defaultAccordionValue,
  defaultErrors,
  onChange,
  onDataPersist,
  parseJsonValue,
}: {
  value: string;
  defaultAccordionValue: string[];
  defaultErrors: E;
  onChange: (value: string) => Error | null;
  onDataPersist?: (data: D) => void;
  parseJsonValue: (value: string) => D;
}) {
  const [state, setState] = useState<PreviewContextState<D, E>>(() => ({
    ...getDefaultState<D, E>(defaultAccordionValue, defaultErrors),
    localParsedData: parseJsonValue(value),
  }));
  const isUpdatingRef = useRef(false);
  const lastValueRef = useRef(value);
  const parsedData = useMemo(() => parseJsonValue(value), [parseJsonValue, value]);

  // Sync external value changes with local state
  useEffect(() => {
    if (value === lastValueRef.current || isUpdatingRef.current) {
      return;
    }

    lastValueRef.current = value;
    setState((prev) => ({
      ...prev,
      localParsedData: parsedData,
    }));
  }, [value, parsedData]);

  const setError = useCallback((section: keyof E, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [section]: error },
    }));
  }, []);

  const updateLocalData = useCallback(
    (section: keyof D, updatedData: any) => {
      setState((prev) => {
        const updatedParsedData = { ...prev.localParsedData, [section]: updatedData };

        onDataPersist?.(updatedParsedData);

        return {
          ...prev,
          localParsedData: updatedParsedData,
        };
      });
    },
    [onDataPersist]
  );

  const updateJsonRef = useDataRef({ onChange, value, setError, updateLocalData, parseJsonValue });

  const updatePreviewSection = useCallback(
    (section: keyof D, updatedData: any) => {
      if (isUpdatingRef.current) return;

      isUpdatingRef.current = true;

      const local = updateJsonRef.current;

      try {
        const currentData = local.parseJsonValue(local.value);
        const newData = { ...currentData, [section]: updatedData };
        const stringified = JSON.stringify(newData, null, 2);

        const error = local.onChange(stringified);

        if (error) {
          local.setError(section, error.message);
        } else {
          local.updateLocalData(section, updatedData);
          local.setError(section, null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update JSON';
        local.setError(section, errorMessage);
      } finally {
        // Use setTimeout to ensure the ref is reset after the current execution cycle
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [updateJsonRef]
  );

  const setAccordionValue = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, accordionValue: value }));
  }, []);

  return {
    accordionValue: state.accordionValue,
    setAccordionValue,
    errors: state.errors,
    previewContext: state.localParsedData,
    updatePreviewSection,
  };
}
