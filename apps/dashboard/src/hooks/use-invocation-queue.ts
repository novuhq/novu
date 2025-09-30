import * as Sentry from '@sentry/react';
import { useCallback, useRef, useState } from 'react';

type CallbackFunction = () => Promise<unknown>;

export function useInvocationQueue<T extends CallbackFunction = CallbackFunction>({
  debounceInMs = 200,
  waitingRoom = Number.MAX_SAFE_INTEGER,
} = {}) {
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const queueRef = useRef<T[]>([]); // Queue to hold pending saves
  const isSavingRef = useRef(false); // Flag to track if a save is in-flight
  const debounceTimerRef = useRef<number | null>(null); // Timer for debouncing

  const processQueue = useCallback(async () => {
    if (isSavingRef.current || queueRef.current.length === 0) {
      return; // Return if a save is already in-flight or the queue is empty
    }

    isSavingRef.current = true;

    while (queueRef.current.length > 0) {
      let nextInvocation;

      if (queueRef.current.length >= waitingRoom) {
        nextInvocation = queueRef.current.pop(); // Get the last item from the queue
        queueRef.current = []; // Clear the queue
      } else {
        nextInvocation = queueRef.current.shift(); // Get the next item in the queue
      }

      await safelyRunInvocation(nextInvocation); // Execute the next autosave function
    }

    if (queueRef.current.length === 0) {
      setHasPendingItems(false);
    }

    isSavingRef.current = false;
  }, [waitingRoom]);

  const enqueue = useCallback(
    (data: T) => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // push the new data to the queue
      queueRef.current.push(data);
      setHasPendingItems(true);

      // Set a new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        processQueue(); // Trigger queue processing
      }, debounceInMs) as any;
    },
    [debounceInMs, processQueue]
  );

  const safelyRunInvocation = useCallback(async (invocation: T | undefined) => {
    if (!invocation) return;

    try {
      await invocation();
    } catch (error) {
      // If the invocation fails, we want to log the error and continue with the next invocation
      Sentry.captureException(error);
    }
  }, []);

  return {
    enqueue,
    hasPendingItems,
  };
}
