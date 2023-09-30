import { IsDefined, MinLength, Matches, MaxLength, IsUUID } from 'class-validator';
import { passwordConstraints } from '@novu/shared';
export class PasswordResetBodyDto {
  @IsDefined()
  @MinLength(passwordConstraints.minLength)
  @MaxLength(passwordConstraints.maxLength)
  @Matches(passwordConstraints.pattern, {
    message:
      // eslint-disable-next-line max-len
      'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-',
  })
  password: string;

  @IsDefined()
  @IsUUID(4, {
    message: 'Bad token provided',
  })
  token: string;
}
