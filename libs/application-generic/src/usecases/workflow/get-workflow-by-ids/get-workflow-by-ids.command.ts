import { ClientSession } from '@novu/dal';
import { Exclude } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../commands';

export class GetWorkflowByIdsCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  workflowIdOrInternalId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  includeUpdatedBy?: boolean;

  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
