import { EnvironmentWithUserCommand } from '@novu/application-generic';
import type {
  JobEntity,
  NotificationStepEntity,
  NotificationTemplateEntity,
  PreferencesEntity,
  SubscriberEntity,
} from '@novu/dal';
import type { SeverityLevelEnum, TriggerOverrides, WorkflowPreferences } from '@novu/shared';
import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class SendMessageCommand extends EnvironmentWithUserCommand {
  /**
   * Created per subscriber per step with the job, step and cached workflow; deep-copying them
   * dominated create() cost. Consumers (send-message/*, incl. SendMessageChannelCommand) must not
   * mutate nested fields in place — `step.template` comes from the shared workflow cache.
   */
  protected static readonly skipDeepTransform = true;

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  // biome-ignore lint/suspicious/noExplicitAny: Existing untyped trigger payload is outside this change.
  payload: any;

  @IsDefined()
  overrides: TriggerOverrides;

  @IsDefined()
  step: NotificationStepEntity;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  notificationId: string;

  @IsOptional()
  _templateId?: string;

  @IsDefined()
  subscriberId: string;

  @IsDefined()
  _subscriberId: string;

  @IsDefined()
  jobId: string;

  @IsOptional()
  // biome-ignore lint/suspicious/noExplicitAny: Existing untyped digest events are outside this change.
  events?: any[];

  @IsDefined()
  job: JobEntity;

  @IsDefined()
  tags: string[];

  @IsOptional()
  severity?: SeverityLevelEnum;

  @IsOptional()
  statelessPreferences?: WorkflowPreferences;

  @IsArray()
  @IsString({ each: true })
  contextKeys: string[];

  @IsOptional()
  workflow?: NotificationTemplateEntity;

  /**
   * Payload-dedup: when true, channel usecases must not persist the trigger
   * payload on the message (email/SMS/push). In-app keeps its payload.
   */
  @IsOptional()
  isPayloadDedupEnabled?: boolean;

  /** The job's subscriber, when RunJob already loaded it. Omitted, SendMessage fetches it. */
  @IsOptional()
  subscriber?: SubscriberEntity | null;

  /**
   * The subscriber's SUBSCRIBER_GLOBAL preference RunJob read for the schedule check,
   * reused by the channel preference evaluation. `null` means there is none;
   * `undefined` means it was not read.
   */
  @IsOptional()
  subscriberGlobalPreference?: PreferencesEntity | null;
}
