import { SubscriberEntity, TenantEntity } from '@novu/dal';
import { ICondition, IMessageFilter, ITriggerPayload } from '@novu/shared';

export interface IFilterVariables {
  payload?: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
  tenant?: TenantEntity;
}

export class FilterProcessingDetails {
  private conditions: ICondition[] = [];
  private filter: IMessageFilter;
  private variables: IFilterVariables;

  addFilter(filter: IMessageFilter, variables: IFilterVariables) {
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
