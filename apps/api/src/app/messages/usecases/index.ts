import { TranslateMessage } from './translate-message/translate-message.usecase';
import { GetMessages } from './get-messages';
import { RemoveMessage } from './remove-message';

export const USE_CASES = [RemoveMessage, GetMessages, TranslateMessage];
