import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class SessionInitializeRequestDto {
  @ApiProperty({
    description: 'Your internal identifire for subscriber',
  })
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ApiProperty({
    description: 'Identifire for your application can be found in settings for Novu',
  })
  @IsString()
  @IsDefined()
  applicationIdentifier: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hmacHash?: string;
}
