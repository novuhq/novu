import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class SessionInitializeBodyDto {
  @IsString()
  @IsDefined()
  $user_id: string;

  @IsString()
  @IsDefined()
  applicationIdentifier: string;

  @IsString()
  @IsOptional()
  $first_name: string;

  @IsString()
  @IsOptional()
  $last_name: string;

  @IsEmail()
  @IsOptional()
  $email: string;

  @IsString()
  @IsOptional()
  $phone: string;
}
