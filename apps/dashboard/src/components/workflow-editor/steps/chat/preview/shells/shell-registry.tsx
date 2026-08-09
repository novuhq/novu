import { ChatProviderIdEnum } from '@novu/shared';
import type { ComponentType } from 'react';

import { DEFAULT_PREVIEW_PROVIDER_ID } from '../use-configured-chat-providers';
import { DefaultPreviewShell } from './default-preview-shell';
import { GenericContentSkeleton } from './generic-content-skeleton';
import { GenericShell } from './generic-shell';
import { MsTeamsShell } from './ms-teams-shell';
import type { ChatShellProps } from './shell-types';
import { SlackContentSkeleton } from './slack-content-skeleton';
import { SlackShell } from './slack-shell';

type ChatPreviewSkin = {
  Shell: ComponentType<ChatShellProps>;
  ContentSkeleton: ComponentType;
  /**
   * `true` when the shell reproduces the platform's real chrome. `false` marks the generic
   * markdown fallback used for providers without a dedicated shell, so the preview can warn that
   * the message must be verified on that platform.
   */
  isSupported: boolean;
};

/**
 * Per-provider preview skin (shell chrome + loading body). Add WhatsApp / Telegram entries here
 * when those shells land; unregistered providers use the generic markdown fallback.
 */
const PREVIEW_SKIN_BY_PROVIDER: Record<string, ChatPreviewSkin> = {
  [DEFAULT_PREVIEW_PROVIDER_ID]: {
    Shell: DefaultPreviewShell,
    ContentSkeleton: GenericContentSkeleton,
    isSupported: true,
  },
  [ChatProviderIdEnum.Slack]: { Shell: SlackShell, ContentSkeleton: SlackContentSkeleton, isSupported: true },
  [ChatProviderIdEnum.Novu]: { Shell: SlackShell, ContentSkeleton: SlackContentSkeleton, isSupported: true },
  [ChatProviderIdEnum.MsTeams]: { Shell: MsTeamsShell, ContentSkeleton: GenericContentSkeleton, isSupported: true },
};

const GENERIC_PREVIEW_SKIN: ChatPreviewSkin = {
  Shell: GenericShell,
  ContentSkeleton: GenericContentSkeleton,
  isSupported: false,
};

export function getChatPreviewSkin(providerId: string): ChatPreviewSkin {
  return PREVIEW_SKIN_BY_PROVIDER[providerId] ?? GENERIC_PREVIEW_SKIN;
}

/** Whether the provider has a platform-accurate shell (vs. the generic markdown fallback). */
export function isChatPreviewSupported(providerId: string): boolean {
  return getChatPreviewSkin(providerId).isSupported;
}

export function getChatShell(providerId: string): ComponentType<ChatShellProps> {
  return getChatPreviewSkin(providerId).Shell;
}

export function getChatContentSkeleton(providerId: string): ComponentType {
  return getChatPreviewSkin(providerId).ContentSkeleton;
}
