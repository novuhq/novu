import { IsDefined, IsEnum } from 'class-validator';

export class CreateEnvironmentBodyDto {
  @IsDefined()
  name: string;
}
