import { IsDefined, IsEmail, IsString } from 'class-validator';

export class LoginBodyDto {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsString()
  password: string;
}
