import { StepFilter } from '@novu/dal';
import {
  BuilderFieldType,
  BuilderGroupValues,
  FilterParts,
} from '@novu/shared';
import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export class ConditionsFilterCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  filters: StepFilter[];
}
