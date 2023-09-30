import { useEffect, useState, useCallback } from 'react';

const storageKey = 'tour';

export const useTourStorage = () => {
  const [state, setState] = useState({});
  const storageValue = localStorage.getItem(storageKey);

  useEffect(() => {
    if (storageValue === null) {
      return;
    }

    setState(JSON.parse(storageValue));
  }, [storageValue]);

  const setTour = useCallback(
    (tour: string, templateId: string, tourStepIndex: number) => {
      const currentState = { ...state };
      if (!currentState[tour]) {
        currentState[tour] = {};
      }
      currentState[tour][templateId] = tourStepIndex;

      setState(currentState);
      localStorage.setItem(storageKey, JSON.stringify(currentState));
    },
    [state]
  );

  const deleteTour = useCallback(
    (tour: string, templateId: string) => {
      const currentState = { ...state };
      if (!currentState[tour]) {
        return;
      }
      currentState[tour] = Object.keys(currentState[tour]).reduce(
        (prev: Record<string, number>, currentTemplateId: string) => {
          if (currentTemplateId === templateId) {
            return prev;
          }

          prev[currentTemplateId] = currentState[tour][currentTemplateId];

          return prev;
        },
        {}
      );
      setState(currentState);
      localStorage.setItem(storageKey, JSON.stringify(currentState));
    },
    [state]
  );

  const getCurrentTour = useCallback(
    (tour: string, templateId: string): number => {
      const currentState = { ...state };

      if (!currentState[tour]) {
        return -1;
      }

      if (currentState[tour][templateId] === undefined) {
        return -1;
      }

      return currentState[tour][templateId] as number;
    },
    [state]
  );

  return {
    setTour,
    deleteTour,
    getCurrentTour,
  };
};
