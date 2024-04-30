import { useInterval } from '@mantine/hooks';
import { useState, useEffect, useCallback } from 'react';

const DEFAULT_MINIMUM_TIME_SECONDS = 0;

interface IUseCountdownTimerProps {
  startTimeSeconds: number;
  minimumTimeSeconds?: number;
}

/**
 * Create a countdown timer that ticks every second.
 */
export const useCountdownTimer = ({
  startTimeSeconds,
  minimumTimeSeconds = DEFAULT_MINIMUM_TIME_SECONDS,
}: IUseCountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(startTimeSeconds);

  const interval = useInterval(() => {
    setTimeRemaining((prev) => Math.max(prev - 1, minimumTimeSeconds));
  }, 1000);

  // tick
  useEffect(() => {
    if (timeRemaining <= minimumTimeSeconds) {
      interval.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  useEffect(() => {
    return () => {
      interval.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Reset the amount of time remaining and restart the timer.
   * @param timeToSet Defaults to the {startTimeSeconds} if no value is provided.
   */
  const resetTimer = (timeToSetSeconds: number = startTimeSeconds) => {
    setTimeRemaining(timeToSetSeconds);
    interval.start();
  };

  const startTimer = useCallback(() => {
    // don't allow the timer to start if it's already at or below the minimum
    if (timeRemaining > minimumTimeSeconds) {
      interval.start();
    }
  }, [interval, timeRemaining, minimumTimeSeconds]);

  return {
    timeRemaining,
    resetTimer,
    stopTimer: interval.stop,
    startTimer,
    isRunning: interval.active,
  };
};
