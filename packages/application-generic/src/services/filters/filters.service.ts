import * as _ from 'lodash';
import { StepFilter, SubscriberEntity, TenantEntity } from '@novu/dal';
import {
  FieldOperatorEnum,
  FILTER_TO_LABEL,
  IBaseFieldFilterPart,
  ICondition,
  ITenantDefine,
  ITriggerPayload,
} from '@novu/shared';

export interface IFilterData {
  subscriber?: SubscriberEntity;
  payload?: any;
}

export interface IFilterVariables {
  payload?: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
  tenant?: TenantEntity;
}

export class FilterProcessingDetails {
  private conditions: ICondition[] = [];
  private filter: StepFilter;
  private variables: IFilterVariables;

  addFilter(filter: StepFilter, variables: IFilterVariables) {
    this.filter = filter;
    this.variables = variables;
    this.conditions = [];
  }

  addCondition(condition: ICondition) {
    this.conditions.push(condition);
  }

  toObject() {
    return {
      payload: this.variables,
      filter: this.filter,
      conditions: this.conditions,
    };
  }

  toString() {
    return JSON.stringify(this.toObject());
  }
}

export class FilterService {
  public operate(
    actualValue: any,
    operator: FieldOperatorEnum,
    filterValue: any
  ): boolean {
    if (operator === FieldOperatorEnum.EQUAL) {
      return actualValue === filterValue;
    }
    if (operator === FieldOperatorEnum.NOT_EQUAL) {
      return actualValue !== filterValue;
    }
    if (operator === FieldOperatorEnum.LARGER) {
      return actualValue > filterValue;
    }
    if (operator === FieldOperatorEnum.SMALLER) {
      return actualValue < filterValue;
    }
    if (operator === FieldOperatorEnum.LARGER_EQUAL) {
      return actualValue >= filterValue;
    }
    if (operator === FieldOperatorEnum.SMALLER_EQUAL) {
      return actualValue <= filterValue;
    }
    if (operator === FieldOperatorEnum.NOT_IN) {
      return actualValue.includes(filterValue);
    }
    if (operator === FieldOperatorEnum.IN) {
      return actualValue.includes(filterValue);
    }
    if (operator === FieldOperatorEnum.IS_DEFINED) {
      return actualValue !== undefined;
    }

    return false;
  }

  public processFilterEquality(
    fieldFilter: IBaseFieldFilterPart,
    filterProcessingDetails: FilterProcessingDetails,
    variables: IFilterVariables
  ): boolean {
    const actualValue = _.get(
      variables,
      `${fieldFilter.on}.${fieldFilter.field}`
    );
    const filterValue = this.parseValue(actualValue, fieldFilter.value);
    const result = this.operate(actualValue, fieldFilter.operator, filterValue);

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

  public async findAsync<T>(
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

  public async filterAsync<T>(
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
