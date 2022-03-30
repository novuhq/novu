import { ChannelTypeEnum } from '@novu/shared';
import { NotificationMessagesEntity } from '@novu/dal';

export function matchMessageWithFilters(
  channel: ChannelTypeEnum,
  messages: NotificationMessagesEntity[],
  payloadVariables: { [key: string]: string | string[] | { [key: string]: string } }
): NotificationMessagesEntity[] {
  return messages.filter((message) => {
    const channelIsMatching = message.template.type === channel;

    if (message.filters?.length) {
      const foundFilter = message.filters.find((filter) => {
        if (filter.type === 'GROUP') {
          return handleGroupFilters(filter, payloadVariables);
        }

        return false;
      });

      return channelIsMatching && foundFilter;
    }

    return channelIsMatching;
  });
}

function handleGroupFilters(filter, payloadVariables) {
  if (filter.value === 'OR') {
    return handleOrFilters(filter, payloadVariables);
  }

  if (filter.value === 'AND') {
    return handleAndFilters(filter, payloadVariables);
  }

  return false;
}

function handleAndFilters(filter, payloadVariables) {
  const foundFilterMatches = filter.children.filter((i) => processFilterEquality(i, payloadVariables));

  return foundFilterMatches.length === filter.children.length;
}

function handleOrFilters(filter, payloadVariables) {
  return filter.children.find((i) => processFilterEquality(i, payloadVariables));
}

function processFilterEquality(i, payloadVariables) {
  if (i.operator === 'EQUAL') {
    return payloadVariables[i.field] === i.value;
  }
  if (i.operator === 'NOT_EQUAL') {
    return payloadVariables[i.field] !== i.value;
  }

  return false;
}
