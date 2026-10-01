/**
 * Why a job was deferred. Each reason maps to a pre-created EventBridge
 * Scheduler group (`${prefix}-${reason}`) so schedules can be listed, metered
 * and cleaned up per reason. Derived from the job rather than read off
 * `job.type` directly: snooze and schedule extensions are channel-typed jobs.
 */
export enum DeferReasonEnum {
  DELAY = 'delay',
  DIGEST = 'digest',
  THROTTLE = 'throttle',
  SNOOZE = 'snooze',
  SCHEDULE_EXTENSION = 'schedule-extension',
}

/** AWS limit on `CreateSchedule.Name`. */
export const SCHEDULER_MAX_NAME_LENGTH = 64;

/** Characters AWS accepts in a schedule name. */
export const SCHEDULER_NAME_PATTERN = /^[0-9a-zA-Z-_.]+$/;

/**
 * AWS limit on `Target.Input`. Standard-topic bodies are ~160 bytes (four
 * ObjectIds), so this only ever guards against an unexpected payload shape.
 */
export const SCHEDULER_MAX_INPUT_BYTES = 256 * 1024;

/**
 * Scheduler retries delivery of the fire to SQS, not execution of the job.
 * Once exhausted the fire goes to the schedule's dead-letter queue. Kept far
 * below the AWS default (185 attempts / 24h) so a job cannot silently surface
 * a day late; SQS SendMessage failures are rare and short-lived.
 */
export const SCHEDULER_DEFAULT_MAX_RETRY_ATTEMPTS = 10;
export const SCHEDULER_DEFAULT_MAX_EVENT_AGE_SECONDS = 3600;

export interface ICreateDelayedFireParams {
  /** Selects the schedule group. */
  deferReason: DeferReasonEnum;
  /** Absolute UTC instant at which the message should land on the queue. */
  fireAt: Date;
  /** Tenant, used as the schedule name prefix so schedules are enumerable per org. */
  organizationId: string;
  /** Job id, already carrying the `-ext{N}` suffix for schedule extensions. */
  scheduleId: string;
  /** Serialized queue message, delivered verbatim as the SQS message body. */
  messageBody: string;
}

export interface IDeleteScheduleParams {
  deferReason: DeferReasonEnum;
  organizationId: string;
  scheduleId: string;
}
