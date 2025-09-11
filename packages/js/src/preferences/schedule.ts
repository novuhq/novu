import { InboxService } from '../api';
import { ScheduleCache } from '../cache/schedule-cache';
import { NovuEventEmitter } from '../event-emitter';
import { Result, WeeklySchedule } from '../types';
import { updateSchedule } from './helpers';
import { UpdateScheduleArgs } from './types';

export type ScheduleLike = Partial<Pick<Schedule, 'isEnabled' | 'weeklySchedule'>>;

export class Schedule {
  #emitter: NovuEventEmitter;
  #apiService: InboxService;
  #cache: ScheduleCache;
  #useCache: boolean;

  readonly isEnabled: boolean | undefined;
  readonly weeklySchedule: WeeklySchedule | undefined;

  constructor(
    schedule: ScheduleLike,
    {
      emitterInstance,
      inboxServiceInstance,
      cache,
      useCache,
    }: {
      emitterInstance: NovuEventEmitter;
      inboxServiceInstance: InboxService;
      cache: ScheduleCache;
      useCache: boolean;
    }
  ) {
    this.#emitter = emitterInstance;
    this.#apiService = inboxServiceInstance;
    this.#cache = cache;
    this.#useCache = useCache;
    this.isEnabled = schedule.isEnabled;
    this.weeklySchedule = schedule.weeklySchedule;
  }

  async update(args: UpdateScheduleArgs): Result<Schedule> {
    const hasWeeklySchedule = !!args.weeklySchedule || !!this.weeklySchedule;

    return updateSchedule({
      emitter: this.#emitter,
      apiService: this.#apiService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: {
        isEnabled: args.isEnabled ?? this.isEnabled,
        ...(hasWeeklySchedule && {
          weeklySchedule: {
            ...this.weeklySchedule,
            ...args.weeklySchedule,
          },
        }),
      },
    });
  }
}
