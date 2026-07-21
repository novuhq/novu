import { ChannelStepEnum } from '../../../constants';
import type { JsonSchema } from '../../../types/schema.types';
import { chatChannelSchemas } from './chat.schema';
import { emailChannelSchemas } from './email.schema';
import { inAppChannelSchemas } from './in-app.schema';
import { pushChannelSchemas } from './push.schema';
import { smsChannelSchemas } from './sms.schema';
import { toolChannelSchemas } from './tool.schema';

export const channelStepSchemas = {
  chat: chatChannelSchemas,
  sms: smsChannelSchemas,
  push: pushChannelSchemas,
  email: emailChannelSchemas,
  in_app: inAppChannelSchemas,
  tool: toolChannelSchemas,
} as const satisfies Record<ChannelStepEnum, { output: JsonSchema; result: JsonSchema }>;
