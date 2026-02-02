import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { AiResourceTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class GetLatestChatCommand extends EnvironmentWithUserObjectCommand {
  @IsNotEmpty()
  @IsEnum(AiResourceTypeEnum)
  resourceType: AiResourceTypeEnum;

  @IsString()
  @IsNotEmpty()
  resourceId: string;
}
