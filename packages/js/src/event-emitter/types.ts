import { INotificationDto } from '@novu/shared';

import { PaginatedResponse } from '../types';

export type Events = {
  'feeds.fetch.*': undefined;
  'feeds.fetch.pending': undefined;
  'feeds.fetch.success': { res: PaginatedResponse<INotificationDto> };
  'feeds.fetch.error': { error: unknown };
};

export type EventNames = keyof Events;

export type EventHandler<T = unknown> = (event: T) => void;
