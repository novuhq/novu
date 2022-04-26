import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class SessionInitializeBodyDto {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @IsString()
  @IsDefined()
  applicationIdentifier: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  phone: string;
}
