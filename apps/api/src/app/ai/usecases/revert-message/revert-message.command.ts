import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RevertMessageCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsMongoId()
  chatId: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  messageId: string;
}
