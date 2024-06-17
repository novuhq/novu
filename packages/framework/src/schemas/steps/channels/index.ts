import { ChannelStepEnum } from '../../../constants';
import { Schema } from '../../../types/schema.types';
import { chatChannelSchemas } from './chat.schema';
import { emailChannelSchemas } from './email.schema';
import { inAppChannelSchemas } from './in-app.schema';
import { pushChannelSchemas } from './push.schema';
import { smsChannelSchemas } from './sms.schema';

export const channelStepSchemas = {
  chat: chatChannelSchemas,
  sms: smsChannelSchemas,
  push: pushChannelSchemas,
  email: emailChannelSchemas,
  in_app: inAppChannelSchemas,
} satisfies Record<ChannelStepEnum, { output: Schema; result: Schema }>;
