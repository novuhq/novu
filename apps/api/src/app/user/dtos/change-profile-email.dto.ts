import { IsDefined, IsEmail } from 'class-validator';

export class ChangeProfileEmailDto {
  @IsDefined()
  @IsEmail()
  email: string;
}
