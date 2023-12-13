import { IsDefined, IsNumber, IsString } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';

export class EvaluateTokenBucketRateLimitCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  @IsNumber()
  maxTokens: number;

  @IsDefined()
  @IsNumber()
  windowDuration: number;

  @IsDefined()
  @IsNumber()
  cost: number;

  @IsDefined()
  @IsNumber()
  refillRate: number;
}
