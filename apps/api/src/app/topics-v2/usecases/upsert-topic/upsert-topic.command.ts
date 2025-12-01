import { EnvironmentCommand } from '@novu/application-generic';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class UpsertTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @IsBoolean()
  @IsOptional()
  failIfExists?: boolean;
}
