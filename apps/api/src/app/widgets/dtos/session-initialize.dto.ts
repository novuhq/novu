import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class SessionInitializeBodyDto {
  @IsString()
  @IsDefined()
  $user_id: string;

  @IsString()
  @IsDefined()
  applicationIdentifier: string;

  @IsString()
  $first_name: string;

  @IsString()
  $last_name: string;

  @IsEmail()
  $email: string;

  @IsString()
  @IsOptional()
  $phone: string;
}
