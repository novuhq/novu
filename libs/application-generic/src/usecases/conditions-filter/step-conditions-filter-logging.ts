import { ICondition } from '@novu/shared';

import { IConditionsFilterResponse } from './conditions-filter.usecase';

export function hasStepConditionsToLog(filtersCount: number, conditions?: ICondition[]): boolean {
  return filtersCount > 0 || (conditions?.length ?? 0) > 0;
}

export function buildStepConditionsFilterRaw(stepCondition: Pick<IConditionsFilterResponse, 'conditions' | 'passed'>): string {
  return JSON.stringify({
    filter: {
      conditions: stepCondition.conditions,
      passed: stepCondition.passed,
    },
  });
}

export function buildSkipConditionFilterRaw(skip: unknown, passed: boolean): string {
  return JSON.stringify({
    filter: {
      skip,
      passed,
    },
  });
}

export function hasSkipConditionRules(skip: unknown): boolean {
  if (!skip || typeof skip !== 'object') {
    return false;
  }

  return Object.keys(skip).length > 0;
}
