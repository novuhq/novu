import * as _ from 'lodash';
import {
  IBaseFieldFilterPart,
  FieldOperatorEnum,
  FILTER_TO_LABEL,
  ICondition,
} from '@novu/shared';

import {
  FilterProcessingDetails,
  IFilterVariables,
} from './filter-processing-details';

export abstract class Filter {
  protected processFilterEquality(
    variables: IFilterVariables,
    fieldFilter: IBaseFieldFilterPart,
    filterProcessingDetails: FilterProcessingDetails
  ): boolean {
    const actualValue = _.get(
      variables,
      `${fieldFilter.on}.${fieldFilter.field}`
    );
    const filterValue = this.parseValue(actualValue, fieldFilter.value);
    let result = false;

    if (fieldFilter.operator === FieldOperatorEnum.EQUAL) {
      result = actualValue === filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.NOT_EQUAL) {
      result = actualValue !== filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.LARGER) {
      result = actualValue > filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.SMALLER) {
      result = actualValue < filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.LARGER_EQUAL) {
      result = actualValue >= filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.SMALLER_EQUAL) {
      result = actualValue <= filterValue;
    }
    if (fieldFilter.operator === FieldOperatorEnum.NOT_IN) {
      result = !actualValue.includes(filterValue);
    }
    if (fieldFilter.operator === FieldOperatorEnum.IN) {
      result = actualValue.includes(filterValue);
    }
    if (fieldFilter.operator === FieldOperatorEnum.IS_DEFINED) {
      result = actualValue !== undefined;
    }
    const actualValueString: string = Array.isArray(actualValue)
      ? JSON.stringify(actualValue)
      : `${actualValue ?? ''}`;

    filterProcessingDetails.addCondition({
      filter: FILTER_TO_LABEL[fieldFilter.on],
      field: fieldFilter.field,
      expected: `${filterValue}`,
      actual: `${actualValueString}`,
      operator: fieldFilter.operator,
      passed: result,
    });

    return result;
  }

  public static sumFilters(
    summary: {
      filters: string[];
      failedFilters: string[];
      passedFilters: string[];
    },
    condition: ICondition,
    type?: string
  ) {
    if (!type) {
      type = condition.filter;
    }

    type = type?.toLowerCase();

    if (condition.passed && !summary.passedFilters.includes(type)) {
      summary.passedFilters.push(type);
    }

    if (!condition.passed && !summary.failedFilters.includes(type)) {
      summary.failedFilters.push(type);
    }

    if (!summary.filters.includes(type)) {
      summary.filters.push(type);
    }

    return summary;
  }

  private parseValue(originValue, parsingValue) {
    switch (typeof originValue) {
      case 'number':
        return Number(parsingValue);
      case 'string':
        return String(parsingValue);
      case 'boolean':
        return parsingValue === 'true';
      case 'bigint':
        return Number(parsingValue);
      default:
        return parsingValue;
    }
  }

  protected async findAsync<T>(
    array: T[],
    predicate: (t: T) => Promise<boolean>
  ): Promise<T | undefined> {
    for (const t of array) {
      if (await predicate(t)) {
        return t;
      }
    }

    return undefined;
  }

  protected async filterAsync<T>(
    arr: T[],
    callback: (item: T) => Promise<boolean>
  ): Promise<T[]> {
    const fail = Symbol('Filter Async failure');

    return (
      await Promise.all(
        arr.map(async (item) => ((await callback(item)) ? item : fail))
      )
    ).filter((i) => i !== fail) as T[];
  }
}
