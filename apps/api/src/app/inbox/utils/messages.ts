import { MessagesStatusEnum } from '@novu/shared';

type MessageStatusQuery = { seen?: boolean; read?: boolean };

export const constructMessageStatusQuery = (status: MessagesStatusEnum[]): MessageStatusQuery => {
  const uniqueStatuses = new Set(status);
  const query = [...uniqueStatuses.values()].reduce<MessageStatusQuery>((acc, el) => {
    let seen: boolean | undefined;
    if ([MessagesStatusEnum.SEEN, MessagesStatusEnum.UNSEEN].includes(el)) {
      seen = typeof acc.seen === 'undefined' ? el === MessagesStatusEnum.SEEN : undefined;

      return {
        ...acc,
        seen,
      };
    }

    let read: boolean | undefined;
    if ([MessagesStatusEnum.READ, MessagesStatusEnum.UNREAD].includes(el)) {
      read = typeof acc.read === 'undefined' ? el === MessagesStatusEnum.READ : undefined;

      return {
        ...acc,
        read,
      };
    }

    return acc;
  }, {});

  return query;
};
