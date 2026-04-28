import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TestDomainRouteFromDto {
  @ApiProperty()
  @IsEmail()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class TestDomainRouteDto {
  @ApiProperty({ type: TestDomainRouteFromDto })
  @ValidateNested()
  @Type(() => TestDomainRouteFromDto)
  @IsObject()
  from: TestDomainRouteFromDto;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description:
      'When true, returns the payload that would be delivered without invoking outbound webhooks or the agent HTTP endpoint.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
