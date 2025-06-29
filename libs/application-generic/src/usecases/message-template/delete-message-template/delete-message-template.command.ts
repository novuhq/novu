import { IsDefined, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ResourceTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../commands';

export class DeleteMessageTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  messageTemplateId: string;

  @IsOptional()
  @IsMongoId()
  parentChangeId?: string;

  @IsEnum(ResourceTypeEnum)
  @IsDefined()
  workflowType: ResourceTypeEnum;
}
