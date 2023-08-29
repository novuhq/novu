import {
  BuilderFieldType,
  BuilderGroupValues,
  FilterParts,
} from '@novu/shared';
import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export interface IFilter {
  isNegated: boolean;

  type: BuilderFieldType;

  value: BuilderGroupValues;

  children: FilterParts[];
}

export class ConditionsFilterCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  filters: IFilter[];
}
