export enum ContentIssueEnum {
  ILLEGAL_VARIABLE_IN_CONTROL_VALUE = 'ILLEGAL_VARIABLE_IN_CONTROL_VALUE',
  INVALID_FILTER_ARG_IN_VARIABLE = 'INVALID_FILTER_ARG_IN_VARIABLE',
  MISSING_VALUE = 'MISSING_VALUE',
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',
}

export enum IntegrationIssueEnum {
  MISSING_INTEGRATION = 'MISSING_INTEGRATION',
  INBOX_NOT_CONNECTED = 'INBOX_NOT_CONNECTED',
}

export class RuntimeIssue {
  issueType: ContentIssueEnum | IntegrationIssueEnum;
  variableName?: string;
  message: string;
}
