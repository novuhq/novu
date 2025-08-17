import { ApiProperty } from '@nestjs/swagger';

export class WorkflowInfoDto {
  @ApiProperty({
    description: 'The name of the workflow',
    example: 'Welcome Email',
  })
  name: string;

  @ApiProperty({
    description: 'The unique identifier of the workflow',
    example: 'welcome-email',
  })
  workflowId: string;
}

export class GetLayoutUsageResponseDto {
  @ApiProperty({
    description: 'Array of workflows that use this layout',
    type: [WorkflowInfoDto],
  })
  workflows: WorkflowInfoDto[];
}
