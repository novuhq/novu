import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { ReportTypeEnum } from './shared.dto';

export class ChartDataPointDto {
  @ApiProperty({ description: 'Chart data point timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'In-app (Inbox) delivery count' })
  @IsNumber()
  inApp: number;

  @ApiProperty({ description: 'Email delivery count' })
  @IsNumber()
  email: number;

  @ApiProperty({ description: 'SMS delivery count' })
  @IsNumber()
  sms: number;

  @ApiProperty({ description: 'Chat delivery count' })
  @IsNumber()
  chat: number;

  @ApiProperty({ description: 'Push delivery count' })
  @IsNumber()
  push: number;
}

export class InteractionTrendDataPointDto {
  @ApiProperty({ description: 'Chart data point timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Messages seen count' })
  @IsNumber()
  messageSeen: number;

  @ApiProperty({ description: 'Messages read count' })
  @IsNumber()
  messageRead: number;

  @ApiProperty({ description: 'Messages snoozed count' })
  @IsNumber()
  messageSnoozed: number;

  @ApiProperty({ description: 'Messages archived count' })
  @IsNumber()
  messageArchived: number;
}

export class WorkflowVolumeDataPointDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  workflowName: string;

  @ApiProperty({ description: 'Number of workflow runs' })
  @IsNumber()
  count: number;
}

export class ProviderVolumeDataPointDto {
  @ApiProperty({ description: 'Provider identifier' })
  @IsString()
  providerId: string;

  @ApiProperty({ description: 'Number of step runs' })
  @IsNumber()
  count: number;
}

export class MessagesDeliveredDataPointDto {
  @ApiProperty({ description: 'Current period count' })
  @IsNumber()
  currentPeriod: number;

  @ApiProperty({ description: 'Previous period count' })
  @IsNumber()
  previousPeriod: number;
}

export class ActiveSubscribersDataPointDto {
  @ApiProperty({ description: 'Current period count' })
  @IsNumber()
  currentPeriod: number;

  @ApiProperty({ description: 'Previous period count' })
  @IsNumber()
  previousPeriod: number;
}

export class AvgMessagesPerSubscriberDataPointDto {
  @ApiProperty({ description: 'Current period average' })
  @IsNumber()
  currentPeriod: number;

  @ApiProperty({ description: 'Previous period average' })
  @IsNumber()
  previousPeriod: number;
}

export class WorkflowRunsMetricDataPointDto {
  @ApiProperty({ description: 'Current period count' })
  @IsNumber()
  currentPeriod: number;

  @ApiProperty({ description: 'Previous period count' })
  @IsNumber()
  previousPeriod: number;
}

export class TotalInteractionsDataPointDto {
  @ApiProperty({ description: 'Current period count' })
  @IsNumber()
  currentPeriod: number;

  @ApiProperty({ description: 'Previous period count' })
  @IsNumber()
  previousPeriod: number;
}

export class WorkflowRunsTrendDataPointDto {
  @ApiProperty({ description: 'Chart data point timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Processing workflow runs count' })
  @IsNumber()
  processing: number;

  @ApiProperty({ description: 'Completed workflow runs count' })
  @IsNumber()
  completed: number;

  @ApiProperty({ description: 'Failed workflow runs count' })
  @IsNumber()
  error: number;
}

export class ActiveSubscribersTrendDataPointDto {
  @ApiProperty({ description: 'Chart data point timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Active subscribers count' })
  @IsNumber()
  count: number;
}

export class WorkflowRunsCountDataPointDto {
  @ApiProperty({ description: 'Workflow runs count' })
  @IsNumber()
  count: number;
}

export class GetChartsResponseDto {
  @ApiProperty({ description: 'Chart sections' })
  @ValidateNested()
  data: Record<
    ReportTypeEnum,
    | ChartDataPointDto[]
    | InteractionTrendDataPointDto[]
    | WorkflowVolumeDataPointDto[]
    | ProviderVolumeDataPointDto[]
    | MessagesDeliveredDataPointDto
    | ActiveSubscribersDataPointDto
    | AvgMessagesPerSubscriberDataPointDto
    | WorkflowRunsMetricDataPointDto
    | TotalInteractionsDataPointDto
    | WorkflowRunsTrendDataPointDto[]
    | ActiveSubscribersTrendDataPointDto[]
    | WorkflowRunsCountDataPointDto
  >;
}
