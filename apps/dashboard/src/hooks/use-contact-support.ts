import { SUPPORT_EMAIL } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';

/** Opens Plain live chat when it is available to the user, otherwise the support email. */
export function useContactSupport() {
  const { isLiveChatVisible, showPlainLiveChat } = usePlainChat();

  return () => {
    if (isLiveChatVisible) {
      showPlainLiveChat();

      return;
    }

    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };
}
