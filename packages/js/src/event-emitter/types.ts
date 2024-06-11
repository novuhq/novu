import { ISessionDto } from '@novu/shared';
import { Notification } from '../feeds/notification';

import { PaginatedResponse } from '../types';

export type Events = {
  'session.initialize.*': undefined;
  'session.initialize.pending': undefined;
  'session.initialize.success': ISessionDto;
  'session.initialize.error': { error: unknown };
  'feeds.fetch.*': undefined;
  'feeds.fetch.pending': undefined;
  'feeds.fetch.success': { response: PaginatedResponse<Notification> };
  'feeds.fetch.error': { error: unknown };
};

export type EventNames = keyof Events;

export type EventHandler<T = unknown> = (event: T) => void;
