import { BadRequestException } from '@nestjs/common';
import { getIntegrationRulesIssues, hasIntegrationRules } from '@novu/application-generic';

export function assertValidIntegrationRules(rules?: unknown): void {
  if (!hasIntegrationRules(rules)) {
    return;
  }

  const issues = getIntegrationRulesIssues(rules);

  if (issues.length > 0) {
    throw new BadRequestException(issues.join('; '));
  }
}
