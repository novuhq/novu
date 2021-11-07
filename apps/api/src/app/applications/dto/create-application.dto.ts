import { IsDefined, IsEnum } from 'class-validator';

export class CreateApplicationBodyDto {
  @IsDefined()
  name: string;
}
