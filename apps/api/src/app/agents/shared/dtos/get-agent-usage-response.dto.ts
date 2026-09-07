import { ApiProperty } from '@nestjs/swagger';

export class AgentWorkflowInfoDto {
  @ApiProperty({
    description: 'The name of the workflow',
    example: 'Welcome Email',
  })
  name: string;

  @ApiProperty({
    description: 'The unique identifier of the workflow (trigger identifier)',
    example: 'welcome-email',
  })
  workflowId: string;
}

export class GetAgentUsageResponseDto {
  @ApiProperty({
    description: 'Array of workflows that have this agent assigned',
    type: [AgentWorkflowInfoDto],
  })
  workflows: AgentWorkflowInfoDto[];
}
