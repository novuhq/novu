import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class CancelStreamCommand extends EnvironmentWithUserObjectCommand {
  @IsDefined()
  @IsString()
  chatId: string;
}
