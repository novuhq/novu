import { ChannelEndpointByType, ENDPOINT_TYPES } from '@novu/shared';

const x = ENDPOINT_TYPES.TELEGRAM_CHAT;
type T = ChannelEndpointByType['telegram_chat'];
const y: T = { chatId: 'x' };
console.log(x, y);
