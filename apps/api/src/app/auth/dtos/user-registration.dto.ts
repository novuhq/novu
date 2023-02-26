import { IsDefined, IsEmail, IsOptional, MinLength, Matches, MaxLength } from 'class-validator';
import { passwordConstraints, SignUpOriginEnum } from '@novu/shared';
export class UserRegistrationBodyDto {
  @IsDefined()
  @IsEmail()
  email: string;

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
  firstName: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  organizationName: string;

  @IsOptional()
  origin?: SignUpOriginEnum;
}
