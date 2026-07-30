import { EnvironmentCommand, IsValidContextData } from '@novu/application-generic';
import { TopicCustomData } from '@novu/shared';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class UpsertTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  @IsValidContextData()
  data?: TopicCustomData | null;

  @IsBoolean()
  @IsOptional()
  failIfExists?: boolean;
}
