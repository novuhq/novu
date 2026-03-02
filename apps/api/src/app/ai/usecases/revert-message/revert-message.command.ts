import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { RevertActionType } from '../../dtos/generate-workflow.dto';

export class RevertMessageCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsMongoId()
  chatId: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  messageId: string;

  @IsDefined()
  @IsEnum(RevertActionType)
  type: RevertActionType;
}
