import { IsDefined, IsEmail } from 'class-validator';

export class LoginBodyDto {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}
