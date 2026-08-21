import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelAgentRunBodyDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsOptional()
  @IsString()
  agentHash?: string;

  /** Client-minted idempotency key for duplicate-safe cancel commands. */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export type CancelAgentRunStatus = 'canceled' | 'no-op' | 'duplicate';

export class CancelAgentRunResponseDto {
  status: CancelAgentRunStatus;
  runId?: string;
}
