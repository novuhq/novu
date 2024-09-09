import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ICreateBridges, IWorkflowDefine } from '../usecases/sync';
import { WorkflowOriginEnum } from '@novu/shared';

export class CreateBridgeRequestDto implements ICreateBridges {
  workflows: IWorkflowDefine[];

  @IsOptional()
  @IsString()
  bridgeUrl: string;

  @IsEnum(WorkflowOriginEnum)
  @IsOptional()
  origin?: WorkflowOriginEnum;
}
