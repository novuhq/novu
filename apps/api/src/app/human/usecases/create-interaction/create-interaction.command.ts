import { HumanInteractionKindEnum } from '@novu/shared';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateInteractionCommand extends EnvironmentWithUserCommand {
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsInt()
  ttlSeconds?: number;
}
