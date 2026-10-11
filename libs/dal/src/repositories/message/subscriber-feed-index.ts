import { Message } from './message.schema';

/**
 * Boolean keys between `channel` and `createdAt` on the subscriber feed index
 * `{ _subscriberId, _environmentId, channel, …, createdAt, _id }`.
 * A new boolean in that gap is pinned automatically. `deleted` is not a schema
 * boolean — the pre-find hook already constrains it, and a later `where()` would
 * overwrite anything set here.
 */
export function subscriberFeedBooleanKeys(): string[] {
  const names = subscriberFeedIndexKeys();

  if (!names) {
    return [];
  }

  return booleanKeysBeforeCreatedAt(names, (field) => isBooleanPath(field));
}

export function booleanKeysBeforeCreatedAt(
  fieldNames: readonly string[],
  isBoolean: (field: string) => boolean
): string[] {
  const channelIndex = fieldNames.indexOf('channel');
  const createdAtIndex = fieldNames.indexOf('createdAt');

  if (channelIndex === -1 || createdAtIndex <= channelIndex) {
    return [];
  }

  return fieldNames.slice(channelIndex + 1, createdAtIndex).filter((field) => isBoolean(field));
}

export function pinMissingBooleanKeys(filterQuery: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    if (filterQuery[field] == null) {
      filterQuery[field] = { $in: [true, false, null] };
    }
  }
}

export function pinMissingSubscriberFeedBooleans(filterQuery: object): void {
  pinMissingBooleanKeys(filterQuery as Record<string, unknown>, subscriberFeedBooleanKeys());
}

/**
 * Subscriber + channel prefix, then only schema booleans (and `deleted`) until `createdAt`.
 * Those are the indexes getMessages can turn into point intervals. Prefer the `_id` tie-break
 * and, if several match, the longest key list.
 */
function subscriberFeedIndexKeys(): string[] | undefined {
  const candidates = Message.schema
    .indexes()
    .map(([keys]) => Object.keys(keys))
    .filter((names) => isBoundableSubscriberFeedIndex(names));

  const withIdTieBreak = candidates.filter((names) => names[names.indexOf('createdAt') + 1] === '_id');
  const pool = withIdTieBreak.length > 0 ? withIdTieBreak : candidates;
  const ranked = [...pool].sort((left, right) => right.length - left.length);

  return ranked[0];
}

function isBoundableSubscriberFeedIndex(names: string[]): boolean {
  if (names[0] !== '_subscriberId' || names[1] !== '_environmentId' || names[2] !== 'channel') {
    return false;
  }

  const createdAtIndex = names.indexOf('createdAt');

  if (createdAtIndex <= 2) {
    return false;
  }

  return names.slice(3, createdAtIndex).every((field) => field === 'deleted' || isBooleanPath(field));
}

function isBooleanPath(field: string): boolean {
  return Message.schema.path(field)?.instance === 'Boolean';
}
