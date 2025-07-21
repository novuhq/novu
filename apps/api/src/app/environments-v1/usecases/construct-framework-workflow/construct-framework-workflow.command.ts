import { EnvironmentLevelCommand } from '@novu/application-generic';
import { IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PostActionEnum } from '@novu/framework/internal';

export class ConstructFrameworkWorkflowCommand extends EnvironmentLevelCommand {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsObject()
  @IsDefined()
  controlValues: Record<string, unknown>;

  @IsEnum(PostActionEnum)
  action: PostActionEnum;

  @IsOptional()
  @IsBoolean()
  skipLayoutRendering?: boolean;
}
