import { IsOptional, IsString } from 'class-validator';
import { ICreateBridges, IWorkflowDefine } from '../usecases/sync';

export class CreateBridgeRequestDto implements ICreateBridges {
  workflows: IWorkflowDefine[];

  @IsOptional()
  @IsString()
  bridgeUrl: string;
}
