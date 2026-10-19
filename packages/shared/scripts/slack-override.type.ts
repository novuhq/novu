import type { ChatPostMessageArguments } from '@slack/web-api';
import { NON_OVERRIDABLE_SLACK_KEYS } from '../src/consts/providers/provider-overrides/slack/keys.ts';

export { NON_OVERRIDABLE_SLACK_KEYS };

export type SlackOverride = Omit<ChatPostMessageArguments, (typeof NON_OVERRIDABLE_SLACK_KEYS)[number]>;
