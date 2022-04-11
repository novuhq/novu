import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateSubscriberBodyDto {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
