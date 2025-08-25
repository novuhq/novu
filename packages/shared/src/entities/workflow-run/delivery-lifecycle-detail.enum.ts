export enum DeliveryLifecycleDetail {
  USER_STEP_CONDITION = 'step_condition',
  SUBSCRIBER_PREFERENCE = 'preference',
  USER_MISSING_PHONE = 'missing_phone',
  USER_MISSING_EMAIL = 'missing_email',
  USER_MISSING_PUSH_TOKEN = 'missing_push_token',
  USER_MISSING_WEBHOOK_URL = 'missing_webhook_url',
  USER_MISSING_CREDENTIALS = 'some_channels_missing_credentials',
  WORKFLOW_MISSING_CHANNEL_STEP = 'workflow_missing_channel_step',
}
