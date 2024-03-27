import { GetOrganizationData } from './get-organization-data/get-organization-data.usecase';
import { MarkMessageAs } from './mark-message-as/mark-message-as.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { UpdateMessageActions } from './mark-action-as-done/update-message-actions.usecase';
import { GetFeedCount } from './get-feed-count/get-feed-count.usecase';
import { RemoveMessage } from './remove-message/remove-message.usecase';
import { MarkAllMessagesAs } from './mark-all-messages-as/mark-all-messages-as.usecase';
import { RemoveAllMessages } from './remove-messages/remove-all-messages.usecase';
import { RemoveMessagesBulk } from './remove-messages-bulk/remove-messages-bulk.usecase';
import { MarkMessageAsByMark } from './mark-message-as-by-mark/mark-message-as-by-mark.usecase';

export const USE_CASES = [
  GetOrganizationData,
  UpdateMessageActions,
  MarkMessageAs,
  GetFeedCount,
  GetNotificationsFeed,
  InitializeSession,
  RemoveMessage,
  RemoveAllMessages,
  MarkAllMessagesAs,
  RemoveMessagesBulk,
  MarkMessageAsByMark,
  //
];
