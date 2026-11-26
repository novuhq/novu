import { IS_SELF_HOSTED } from '@/config';
import { useCopilotSettings } from '@/hooks/use-copilot-settings';
import type { CopilotBlockedReason } from './copilot-web-chat-context';

/** Why the Copilot can't run in this organization, or `undefined` when it can; `isLoading` until that is known. */
export function useCopilotBlockedReason(): { blockedReason?: CopilotBlockedReason; isLoading: boolean } {
  const { settings, isLoading } = useCopilotSettings();

  if (IS_SELF_HOSTED) {
    return { blockedReason: 'cloud-only', isLoading: false };
  }

  if (isLoading) {
    return { isLoading: true };
  }

  return { blockedReason: settings.dashboardEnabled ? undefined : 'turned-off', isLoading: false };
}
