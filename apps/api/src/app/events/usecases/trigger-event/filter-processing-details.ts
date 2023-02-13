import { StepFilter } from '@novu/dal';
import { ICondition } from '@novu/shared';
import { IFilterVariables } from './types';

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
