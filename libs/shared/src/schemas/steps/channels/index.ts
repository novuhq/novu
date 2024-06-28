import { ChannelTypeEnum } from '../../../types';
import { chatChannelSchemas } from './chat.schema';
import { emailChannelSchemas } from './email.schema';
import { inAppChannelSchemas } from './in-app.schema';
import { pushChannelSchemas } from './push.schema';
import { smsChannelSchemas } from './sms.schema';
import { Schema } from '../../../types/framework';

export const channelStepSchemas = {
  [ChannelTypeEnum.CHAT]: chatChannelSchemas,
  [ChannelTypeEnum.SMS]: smsChannelSchemas,
  [ChannelTypeEnum.PUSH]: pushChannelSchemas,
  [ChannelTypeEnum.EMAIL]: emailChannelSchemas,
  [ChannelTypeEnum.IN_APP]: inAppChannelSchemas,
} satisfies Record<ChannelTypeEnum, { output: Schema; result: Schema }>;
