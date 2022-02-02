import { IsDefined, IsObject, IsString } from 'class-validator';

export class TriggerEventDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsObject()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
