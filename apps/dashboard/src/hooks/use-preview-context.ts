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
  const lastSyncedValueRef = useRef(value);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const onDataPersistRef = useDataRef(onDataPersist);
  const parseJsonValueRef = useDataRef(parseJsonValue);
  const parsedData = useMemo(() => parseJsonValue(value), [parseJsonValue, value]);

  // Wraps onChange to synchronously track the latest value in a ref,
  // so that consecutive calls within the same render cycle read fresh data.
  const trackedOnChange = useCallback(
    (newValue: string): Error | null => {
      const error = onChange(newValue);
      if (!error) {
        latestValueRef.current = newValue;
      }

      return error;
    },
    [onChange]
  );

  // Sync external value changes with local state
  useEffect(() => {
    if (value === lastSyncedValueRef.current || isUpdatingRef.current) {
      return;
    }

    lastSyncedValueRef.current = value;
    setState((prev) => ({
      ...prev,
      localParsedData: parsedData,
    }));
  }, [value, parsedData]);

  const updatePreviewSection = useCallback(
    (section: keyof D, updatedData: any) => {
      if (isUpdatingRef.current) return;

      isUpdatingRef.current = true;

      try {
        const currentData = parseJsonValueRef.current(latestValueRef.current);
        const newData = { ...currentData, [section]: updatedData };
        const stringified = JSON.stringify(newData, null, 2);

        const error = trackedOnChange(stringified);

        if (error) {
          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [section]: error.message },
          }));
        } else {
          onDataPersistRef.current?.(newData);
          setState((prev) => ({
            ...prev,
            localParsedData: newData,
            errors: { ...prev.errors, [section]: null },
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update JSON';
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [section]: errorMessage },
        }));
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [trackedOnChange]
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
    trackedOnChange,
  };
}
