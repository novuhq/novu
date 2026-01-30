/**
 * WARNING:
 * DO NOT CHANGE THE VALUES OF THIS ENUM WITHOUT HAVING AN APPROPRIATE MIGRATION PLAN IN PLACE.
 * THE VALUES CORRESPONDING TO QUEUE NAMES AND CHANGING THEM WILL BREAK THE SYSTEM RESULTING
 * IN STALLED JOBS IN THE QUEUE.
 */
export enum JobTopicNameEnum {
  ACTIVE_JOBS_METRIC = 'metric-active-jobs',
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  PROCESS_SUBSCRIBER = 'process-subscriber',
  TRANSLATION = 'translation-queue',
}

export enum ObservabilityBackgroundTransactionEnum {
  JOB_PROCESSING_QUEUE = 'job-processing-queue',
  SUBSCRIBER_PROCESSING_QUEUE = 'subscriber-processing-queue',
  TRIGGER_HANDLER_QUEUE = 'trigger-handler-queue',
  WS_SOCKET_QUEUE = 'ws_socket_queue',
  WS_SOCKET_SOCKET_CONNECTION = 'ws_socket_handle_connection',
  WS_SOCKET_HANDLE_DISCONNECT = 'ws_socket_handle_disconnect',
  CRON_JOB_QUEUE = 'cron-job-queue',
  TRANSLATION_QUEUE = 'translation-queue',
}

export enum JobCronNameEnum {
  SEND_CRON_METRICS = 'send-cron-metrics',
  CREATE_BILLING_USAGE_RECORDS = 'create-billing-usage-records',
}

/**
 * Resource types that support translation
 */
export enum TranslationResourceTypeEnum {
  WORKFLOW = 'workflow',
  LAYOUT = 'layout',
}

/**
 * Status of a translation job
 */
export enum TranslationJobStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Job data interface for translation queue
 *
 * This interface defines the data payload for translation jobs
 * processed by the TranslationWorker.
 */
export interface ITranslationJobData {
  /**
   * Organization ID (used for settings lookup and authorization)
   */
  _organizationId: string;

  /**
   * Environment ID
   */
  _environmentId: string;

  /**
   * User ID who requested the translation
   */
  _userId: string;

  /**
   * Resource identifier (workflow slug or layout identifier)
   */
  resourceId: string;

  /**
   * Internal resource ID (MongoDB ObjectId)
   */
  resourceInternalId?: string;

  /**
   * Type of resource being translated
   */
  resourceType: TranslationResourceTypeEnum;

  /**
   * Target locales to translate to
   * If empty, uses organization default locales
   */
  targetLocales?: string[];

  /**
   * Source locale (defaults to organization default)
   */
  sourceLocale?: string;

  /**
   * Content to translate, keyed by content identifier
   * Key format: 'step.<stepId>.<field>' or 'layout.<field>'
   */
  sourceContent: Record<string, string>;

  /**
   * Optional: Content type hint for better translation quality
   */
  contentType?: 'email' | 'sms' | 'push' | 'in-app' | 'chat';

  /**
   * Optional: Custom instructions for translation
   */
  customInstructions?: string;

  /**
   * Job reference ID for status tracking
   */
  jobReferenceId?: string;

  /**
   * Optional: Created timestamp
   */
  createdAt?: string;
}
