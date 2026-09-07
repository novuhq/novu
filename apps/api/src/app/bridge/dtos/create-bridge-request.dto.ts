import { IsOptional, IsUrl } from 'class-validator';
import { ICreateBridges, IWorkflowDefine } from '../usecases/sync';

export class CreateBridgeRequestDto implements ICreateBridges {
  workflows: IWorkflowDefine[];

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    require_tld: false,
    protocols: ['http', 'https'],
  })
  bridgeUrl: string;
}
