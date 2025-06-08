import { useCallback, useState, useEffect, useRef } from 'react';
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

export function usePreviewContext(
  value: string,
  onChange: (value: string) => Error | null,
  persistenceProps?: UsePreviewContextProps
) {
  const [accordionValue, setAccordionValue] = useState<string[]>(DEFAULT_ACCORDION_VALUES);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [subscriberSearchValue, setSubscriberSearchValue] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({ payload: null, subscriber: null });
  const [localParsedData, setLocalParsedData] = useState<ParsedData>(() => parseJsonValue(value));
  const isUpdatingRef = useRef<boolean>(false);
  const lastValueRef = useRef<string>(value);

  // Update local parsed data when external value changes (but not during our own updates)
  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;

      if (!isUpdatingRef.current) {
        const newParsedData = parseJsonValue(value);
        setLocalParsedData(newParsedData);
      }
    }
  }, [value]);

  // Generic JSON update handler
  const updateJsonSection = useCallback(
    (section: keyof ParsedData, updatedData: any) => {
      isUpdatingRef.current = true;

      try {
        const currentData = parseJsonValue(value);
        const newData = { ...currentData, [section]: updatedData };
        const stringified = JSON.stringify(newData, null, 2);
        const error = onChange(stringified);

        if (error) {
          setErrors((prev) => ({ ...prev, [section]: error.message }));
        } else {
          setLocalParsedData((prev) => {
            const updatedParsedData = { ...prev, [section]: updatedData };

            // Trigger persistence callback if provided
            if (persistenceProps?.onDataPersist) {
              persistenceProps.onDataPersist(updatedParsedData);
            }

            return updatedParsedData;
          });
          setErrors((prev) => ({ ...prev, [section]: null }));
        }
      } catch (error) {
        setErrors((prev) => ({ ...prev, [section]: 'Failed to update JSON' }));
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [onChange, value, persistenceProps]
  );

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updateJsonSection('subscriber', subscriberData);
      setSubscriberSearchValue('');
    },
    [updateJsonSection]
  );

  const toggleStepOpen = useCallback((stepId: string) => {
    setOpenSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  return {
    accordionValue,
    setAccordionValue,
    openSteps,
    toggleStepOpen,
    subscriberSearchValue,
    setSubscriberSearchValue,
    errors,
    localParsedData,
    updateJsonSection,
    handleSubscriberSelection,
  };
}
