import { IsArray, IsBoolean, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationStepDto } from '../../dto';

export class UpdateNotificationTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsArray()
  @IsOptional()
  tags: string[];

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsBoolean()
  @IsOptional()
  critical: boolean;

  @IsOptional()
  @IsMongoId({
    message: 'Bad group id name',
  })
  notificationGroupId: string;

  @IsArray()
  @ValidateNested()
  @IsOptional()
  steps: NotificationStepDto[];
}
