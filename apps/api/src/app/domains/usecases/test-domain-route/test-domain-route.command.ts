import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

class TestDomainRouteFromCommand {
  @IsEmail()
  address: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class TestDomainRouteCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @ValidateNested()
  @Type(() => TestDomainRouteFromCommand)
  from: TestDomainRouteFromCommand;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
