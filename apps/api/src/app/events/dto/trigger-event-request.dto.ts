import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { TriggerRecipientsType } from '@novu/node';

export class TriggerEventRequestDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  to: TriggerRecipientsType; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  @IsOptional()
  transactionId: string;
}
