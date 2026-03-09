import { WorkflowIssueTypeEnum } from '@novu/shared';

export class RuntimeIssueDto {
  issueType: WorkflowIssueTypeEnum;
  variableName?: string;
  message: string;
}
