export enum ContentIssueEnum {
  ILLEGAL_VARIABLE_IN_CONTROL_VALUE = 'ILLEGAL_VARIABLE_IN_CONTROL_VALUE',
  INVALID_FILTER_ARG_IN_VARIABLE = 'INVALID_FILTER_ARG_IN_VARIABLE',
  INVALID_URL = 'INVALID_URL',
  MISSING_VALUE = 'MISSING_VALUE',
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',
  UNSUPPORTED_PROPERTY = 'UNSUPPORTED_PROPERTY',
  CHAT_CARD_LIMIT_EXCEEDED = 'CHAT_CARD_LIMIT_EXCEEDED',
  // Invalid Rich Chat link-button field (empty/invalid label or url). Distinct from MISSING_VALUE so
  // the dashboard footer does not treat it as a stale "empty control" issue and suppress it — the
  // `body` control holds card content, so its per-field errors must surface even when body is non-empty.
  CHAT_CARD_INVALID_BUTTON = 'CHAT_CARD_INVALID_BUTTON',
}

export enum IntegrationIssueEnum {
  MISSING_INTEGRATION = 'MISSING_INTEGRATION',
  INBOX_NOT_CONNECTED = 'INBOX_NOT_CONNECTED',
}

/**
 * Blocking severity of a step issue. `ERROR` (the default when `severity` is omitted, for
 * backwards compatibility) means the value is invalid and must be fixed before the step can
 * deliver — it blocks save. `WARNING` is a non-blocking notice (e.g. a rich chat card a platform
 * will truncate/flatten but still deliver): the dashboard shows it without gating the workflow.
 */
export enum StepIssueSeverityEnum {
  ERROR = 'error',
  WARNING = 'warning',
}

export class RuntimeIssue {
  issueType: ContentIssueEnum | IntegrationIssueEnum;
  variableName?: string;
  message: string;
  severity?: StepIssueSeverityEnum;
}
