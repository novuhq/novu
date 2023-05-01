import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobEntity } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';

import { EnvironmentWithSubscriber } from '../../commands/project.command';
import { CreateExecutionDetailsCommand } from '../create-execution-details';

export class BulkCreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  details: CreateExecutionDetailsCommand[];
}
