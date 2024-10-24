import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class WorkflowTestDataCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  identifierOrInternalId: string;
}
