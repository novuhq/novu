import { IGetWorkflowOverrideResponseDto } from './get-workflow-override-response.dto';

export interface IGetWorkflowOverridesResponseDto {
  hasMore: boolean;

  data: IGetWorkflowOverrideResponseDto[];

  pageSize: number;

  page: number;
}
