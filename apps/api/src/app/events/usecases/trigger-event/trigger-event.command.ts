import { IsDefined, IsString, IsOptional } from 'class-validator';
import { ISubscribersDefine } from '@novu/node';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class TriggerEventCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  to: ISubscribersDefine[];

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsOptional()
  actor?: ISubscribersDefine;
}
