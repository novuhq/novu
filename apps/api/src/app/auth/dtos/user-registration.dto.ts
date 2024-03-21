import { IsDefined, IsEmail, IsOptional, MinLength, Matches, MaxLength, IsString, IsEnum } from 'class-validator';
import { JobTitleEnum, passwordConstraints, ProductUseCases, SignUpOriginEnum } from '@novu/shared';
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
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsEnum(SignUpOriginEnum)
  origin?: SignUpOriginEnum;

  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsOptional()
  productUseCases?: ProductUseCases;
}
