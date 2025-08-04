import { EnvironmentLevelCommand } from '@novu/application-generic';
import { PostActionEnum } from '@novu/framework/internal';
import { IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  @IsString()
  jobId?: string;
}
