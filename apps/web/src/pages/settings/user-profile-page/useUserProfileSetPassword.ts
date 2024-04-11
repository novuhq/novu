import { errorMessage } from '@novu/design-system';
import { IResponseError, PasswordResetFlowEnum } from '@novu/shared';
import { api, useAuthContext } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useCountdownTimer } from '../../../hooks';

const COUNTDOWN_TIMER_START_SECONDS = 60;

export const useUserProfileSetPassword = () => {
  const { currentUser } = useAuthContext();
  const {
    timeRemaining: countdownTimerSeconds,
    resetTimer,
    stopTimer,
  } = useCountdownTimer({
    // start at 0 in the event the user opens the page directly to the set password flow via URL
    startTimeSeconds: 0,
  });

  const { mutateAsync } = useMutation<
    { success: boolean },
    IResponseError,
    {
      email: string;
    }
  >((data) => api.post(`/v1/auth/reset/request`, data, { src: PasswordResetFlowEnum.USER_PROFILE }), {
    onError: (err) => {
      errorMessage(`There was an error sending your email. Please refresh and try again. Error: ${err.message}`);
    },
  });

  const sendVerificationEmail = async () => {
    // don't allow to reset the timer if it is running
    if (countdownTimerSeconds > 0) {
      return;
    }

    resetTimer(COUNTDOWN_TIMER_START_SECONDS);

    // this should never happen, but helps with type checking, and better to be defensive
    if (!currentUser?.email) {
      errorMessage('You must have a valid email tied to your logged-in user.');

      return;
    }

    await mutateAsync({ email: currentUser.email });
  };

  return {
    sendVerificationEmail,
    countdownTimerSeconds,
    stopTimer,
  };
};
