import { passwordConstraints } from '@novu/shared';
import { IsDefined, IsEmail, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class PasswordResetBodyDto {
  @IsDefined()
  @MinLength(passwordConstraints.minLength)
  @MaxLength(passwordConstraints.maxLength)
  @Matches(passwordConstraints.pattern, {
    message:
      'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-',
  })
  password: string;

  @IsDefined()
  @IsUUID(4, {
    message: 'Bad token provided',
  })
  token: string;
}

export class PasswordResetRequestBodyDto {
  @IsDefined()
  @IsEmail()
  email: string;
}
