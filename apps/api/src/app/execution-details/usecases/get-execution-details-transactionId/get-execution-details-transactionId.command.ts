import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined, IsNumber } from 'class-validator';

export class GetExecutionDetailsByTransactionIdCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsDefined()
  transactionId: string;
}
