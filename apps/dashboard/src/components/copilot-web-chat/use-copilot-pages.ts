import { type CopilotPageEnum, FeatureFlagsKeysEnum, parseCopilotPages } from '@novu/shared';
import { useLocation } from 'react-router-dom';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useFeatureFlag, useLaunchDarklyIdentified, useParsedFeatureFlag } from '@/hooks/use-feature-flag';
import { resolveActiveCopilotPage } from './copilot-pages';

const NO_PAGES: CopilotPageEnum[] = [];

/** The dashboard pages the organization-scoped `COPILOT_PAGES` flag turns the Copilot on for. */
export function useCopilotPages(): CopilotPageEnum[] {
  const pages = useParsedFeatureFlag(FeatureFlagsKeysEnum.COPILOT_PAGES, parseCopilotPages);
  const isWebChatEnabled =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_COPILOT_WEB_CHAT_ENABLED, false) && IS_AI_FEATURES_ENABLED;
  // Both flags target organizations: until LaunchDarkly identifies the current one, they can be the previous one's.
  const isLaunchDarklyIdentified = useLaunchDarklyIdentified();

  // Every page stays off while web chat is off.
  return isWebChatEnabled && isLaunchDarklyIdentified ? pages : NO_PAGES;
}

export function useCopilotPageEnabled(page: CopilotPageEnum): boolean {
  return useCopilotPages().includes(page);
}

/**
 * The page whose Copilot shows on the current route, if any. Unlike `useCopilotPageEnabled`, false for the same page's
 * views inside the workflow editor (its Activity tab), which keep the editor's own Copilot.
 */
export function useActiveCopilotPage(): CopilotPageEnum | undefined {
  const { pathname } = useLocation();
  const pages = useCopilotPages();

  return resolveActiveCopilotPage(pathname, pages);
}
