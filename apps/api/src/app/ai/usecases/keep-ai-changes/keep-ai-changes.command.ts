import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

export class KeepAiChangesCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsMongoId()
  chatId: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}
