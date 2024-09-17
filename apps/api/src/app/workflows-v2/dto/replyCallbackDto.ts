import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class ReplyCallbackDto {
  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsString()
  @IsDefined()
  url: string;
}
