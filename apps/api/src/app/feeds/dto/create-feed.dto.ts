import { IsDefined, IsString } from 'class-validator';

export class CreateFeedDto {
  @IsString()
  @IsDefined()
  name: string;
}
