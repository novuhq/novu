import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateChangeCommand extends EnvironmentWithUserCommand {
  @IsMongoId()
  _entityId: string;

  @IsDefined()
  @IsString()
  type: ChangeEntityTypeEnum;

  @IsMongoId()
  parentChangeId: string;
}
