import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { ISubscriberResponseDto } from '@novu/shared';
import { ParsedData, ValidationErrors } from '../types/preview-context.types';
import { parseJsonValue, createSubscriberData } from '../utils/preview-context.utils';
import { DEFAULT_ACCORDION_VALUES } from '../constants/preview-context.constants';

type UsePreviewContextProps = {
  workflowId?: string;
  stepId?: string;
  environmentId?: string;
  onDataPersist?: (data: ParsedData) => void;
};

type PreviewContextState = {
  accordionValue: string[];
  openSteps: Record<string, boolean>;
  subscriberSearchValue: string;
  errors: ValidationErrors;
  localParsedData: ParsedData;
};

const INITIAL_STATE: Omit<PreviewContextState, 'localParsedData'> = {
  accordionValue: DEFAULT_ACCORDION_VALUES,
  openSteps: {},
  subscriberSearchValue: '',
  errors: { payload: null, subscriber: null, steps: null },
};

export function usePreviewContext(
  value: string,
  onChange: (value: string) => Error | null,
  persistenceProps?: UsePreviewContextProps
) {
  const [state, setState] = useState<PreviewContextState>(() => ({
    ...INITIAL_STATE,
    localParsedData: parseJsonValue(value),
  }));

  const isUpdatingRef = useRef(false);
  const lastValueRef = useRef(value);

  const parsedData = useMemo(() => parseJsonValue(value), [value]);

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

  const setError = useCallback((section: keyof ValidationErrors, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [section]: error },
    }));
  }, []);

  const updateLocalData = useCallback(
    (section: keyof ParsedData, updatedData: any) => {
      setState((prev) => {
        const updatedParsedData = { ...prev.localParsedData, [section]: updatedData };

        persistenceProps?.onDataPersist?.(updatedParsedData);

        return {
          ...prev,
          localParsedData: updatedParsedData,
        };
      });
    },
    [persistenceProps]
  );

  const updateJsonSection = useCallback(
    (section: keyof ParsedData, updatedData: any) => {
      if (isUpdatingRef.current) return;

      isUpdatingRef.current = true;

      try {
        const currentData = parseJsonValue(value);
        const newData = { ...currentData, [section]: updatedData };
        const stringified = JSON.stringify(newData, null, 2);

        const error = onChange(stringified);

        if (error) {
          setError(section, error.message);
        } else {
          updateLocalData(section, updatedData);
          setError(section, null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update JSON';
        setError(section, errorMessage);
      } finally {
        // Use setTimeout to ensure the ref is reset after the current execution cycle
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [onChange, value, setError, updateLocalData]
  );

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updateJsonSection('subscriber', subscriberData);

      setState((prev) => ({
        ...prev,
        subscriberSearchValue: '',
      }));
    },
    [updateJsonSection]
  );

  const setAccordionValue = useCallback((value: string[]) => {
    setState((prev) => ({ ...prev, accordionValue: value }));
  }, []);

  const setSubscriberSearchValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, subscriberSearchValue: value }));
  }, []);

  const toggleStepOpen = useCallback((stepId: string) => {
    setState((prev) => ({
      ...prev,
      openSteps: { ...prev.openSteps, [stepId]: !prev.openSteps[stepId] },
    }));
  }, []);

  return {
    accordionValue: state.accordionValue,
    setAccordionValue,
    openSteps: state.openSteps,
    toggleStepOpen,
    subscriberSearchValue: state.subscriberSearchValue,
    setSubscriberSearchValue,
    errors: state.errors,
    localParsedData: state.localParsedData,
    updateJsonSection,
    handleSubscriberSelection,
  };
}
