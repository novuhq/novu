import { IsDefined, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class UserRegistrationBodyDto {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  @MinLength(8)
  password: string;

  @IsDefined()
  firstName: string;

  @IsDefined()
  lastName: string;

  @IsOptional()
  organizationName: string;
}
