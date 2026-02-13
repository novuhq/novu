import { JobEntity, SubscriberEntity } from '@novu/dal';
import { ContextResolved, State } from '@novu/framework/internal';
import { ITriggerPayload } from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentLevelCommand } from '../../commands';

export type StepResolverError = {
  url: string;
  code: string;
  message: string;
  statusCode: number;
  data?: unknown;
  cause?: unknown;
};

export class ExecuteStepResolverCommand extends EnvironmentLevelCommand {
  @IsDefined()
  @IsString()
  stepResolverHash: string;

  @IsDefined()
  @IsString()
  stepId: string;

  @IsDefined()
  payload: {
    payload: ITriggerPayload;
    subscriber?: SubscriberEntity;
    context?: ContextResolved;
    steps: State[];
  };

  @IsOptional()
  job?: JobEntity;

  @IsOptional()
  retriesLimit?: number;
}
