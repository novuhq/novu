/**
 * @novu/eve — connect an Eve agent to Novu.
 *
 * A single unified Eve channel (`novuChannel`) that rides Novu's agent reply
 * flow: unified subscriber identity, multi-channel delivery, and cross-platform
 * human-in-the-loop. Built on `@novu/framework` (not `@novu/chat-adapter`).
 *
 * The Eve-facing surface (`novuChannel`, `novuTool`, `connectNovuCredentials`,
 * `NovuView`, the `channel.novu.*` object) is implemented against Eve's real
 * types and added in subsequent modules. This entry point currently re-exports
 * the `@novu/framework` building blocks Eve developers compose with, so they
 * need only a single dependency.
 */

// The single unified Novu channel — default export of agent/channels/novu.ts.
export {
  novuChannel,
  type NovuChannelOptions,
  type NovuChannelContext,
  type NovuChannelApi,
  type NovuSessionState,
} from './channel.js';

// Connecting Novu: env-first credentials + the Vercel-native helper.
export {
  connectNovuCredentials,
  resolveNovuCredentials,
  type NovuCredentials,
  type NovuCredentialsInput,
  type NovuCredentialsSource,
} from './credentials.js';

// Code-first workflow definitions ("trigger + execute user code").
export { workflow, step } from '@novu/framework';

// Shared Chat SDK card vocabulary — identical to what Eve renders. A card built
// once renders on both sides with no translation.
export {
  Actions,
  Button,
  Card,
  CardLink,
  CardText,
  Divider,
  Select,
  SelectOption,
  TextInput,
} from '@novu/framework';

// Agent runtime + reply-flow protocol types.
export type {
  Agent,
  AgentAction,
  AgentBridgeRequest,
  AgentContext,
  AgentConversation,
  AgentReplyPayload,
  AgentSubscriber,
  CardChild,
  CardElement,
  MessageContent,
  ReplyContent,
  ReplyHandle,
  Signal,
  TriggerSignal,
} from '@novu/framework';
