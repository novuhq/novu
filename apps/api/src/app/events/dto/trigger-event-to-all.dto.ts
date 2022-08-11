import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerEventToAllDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  @IsOptional()
  transactionId: string;

  @IsObject()
  @IsOptional()
  overrides: Record<string, Record<string, unknown>>;
}
