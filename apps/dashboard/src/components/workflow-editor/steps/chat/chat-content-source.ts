import { ChannelTypeEnum } from '@novu/shared';
import { type OverrideChannel } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';

/** Binds the channel-agnostic provider-override machinery to the chat channel. */
export const CHAT_OVERRIDE_CHANNEL: OverrideChannel = ChannelTypeEnum.CHAT;
