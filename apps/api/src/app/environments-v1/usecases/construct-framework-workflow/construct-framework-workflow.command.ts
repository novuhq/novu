import { EnvironmentLevelCommand } from '@novu/application-generic';
import { PostActionEnum } from '@novu/framework/internal';
import { EnvironmentTypeEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class ConstructFrameworkWorkflowCommand extends EnvironmentLevelCommand {
  @IsString()
  @IsDefined()
  workflowId: string;

  @IsString()
  @IsOptional()
  layoutId?: string;

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

  @IsEnum(EnvironmentTypeEnum)
  @IsOptional()
  environmentType?: EnvironmentTypeEnum;
}
