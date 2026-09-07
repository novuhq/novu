import { ApiProperty } from '@nestjs/swagger';

export class EnvironmentVariableWorkflowInfoDto {
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

export class GetEnvironmentVariableUsageResponseDto {
  @ApiProperty({
    description: 'Array of workflows that reference this environment variable',
    type: [EnvironmentVariableWorkflowInfoDto],
  })
  workflows: EnvironmentVariableWorkflowInfoDto[];
}
