import { ChannelTypeEnum, type ToolContentOverrideProviderId, ToolProviderIdEnum } from '@novu/shared';
import { type OverrideChannel } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';

/** Binds the channel-agnostic provider-override machinery to the tool channel. */
export const TOOL_OVERRIDE_CHANNEL: OverrideChannel = ChannelTypeEnum.TOOL;

export const WEBHOOK_TOOL_PROVIDER_ID = ToolProviderIdEnum.Webhook;

export type DashboardToolContentOverrideProviderId = ToolContentOverrideProviderId;
