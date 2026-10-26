import { BadRequestException } from '@nestjs/common';

/**
 * How far the listener's wait has read: every message up to `at` (epoch ms), and, when `id` is set, those at
 * exactly `at` up to that one. Messages are read in the order they were stored, so this is all a wait needs to
 * go on from where the last one stopped.
 */
export type ListenCursor = { at: number; id?: string };

/** Machine-readable code of the answer to an `after` that isn't a cursor the API handed out. */
export const INVALID_LISTEN_CURSOR = 'invalid_listen_cursor';

const VERSION = 'w1';

const OBJECT_ID = /^[a-f0-9]{24}$/;

/** The cursor as the API hands it out: opaque to the CLI, which only passes it back. */
export function encodeListenCursor(cursor: ListenCursor): string {
  return Buffer.from([VERSION, cursor.at, cursor.id ?? ''].join(':')).toString('base64url');
}

/** Reads a cursor the API handed out. Anything else is a 400, rather than a guess at where to go on from. */
export function decodeListenCursor(value: string): ListenCursor {
  const [version, at, id, ...rest] = Buffer.from(value, 'base64url').toString('utf8').split(':');
  const time = Number(at);

  if (version !== VERSION || rest.length > 0 || !/^\d{1,15}$/.test(at ?? '') || !Number.isSafeInteger(time)) {
    throw invalidCursor();
  }

  if (id && !OBJECT_ID.test(id)) {
    throw invalidCursor();
  }

  return id ? { at: time, id } : { at: time };
}

/**
 * Where a wait starts reading: from the cursor, but never from further back than `oldest` (messages older than
 * that never start a host), and never from the future.
 */
export function clampListenCursor(cursor: ListenCursor, oldest: number, now: number): ListenCursor {
  if (cursor.at < oldest) {
    return { at: oldest };
  }

  if (cursor.at > now) {
    return { at: now };
  }

  return cursor;
}

function invalidCursor(): BadRequestException {
  return new BadRequestException({
    code: INVALID_LISTEN_CURSOR,
    message: '`after` is not a cursor this API handed out. Pass the `next` of the last answer, or leave it out.',
  });
}
