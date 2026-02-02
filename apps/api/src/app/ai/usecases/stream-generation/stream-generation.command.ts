import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { UIMessage } from 'ai';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class StreamGenerationCommand extends EnvironmentWithUserObjectCommand {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  messages: UIMessage[];

  @IsNotEmpty()
  @IsString()
  chatId: string;
}
