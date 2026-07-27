import { ClientSession } from '@novu/dal';
import { ResourceTypeEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
import { IsDefined, IsEnum, IsMongoId, IsOptional } from 'class-validator';
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

  /**
   * Exclude session from serialized output only (`toPlainOnly`). A bare
   * `@Exclude()` would also strip it during `plainToInstance` inside
   * `BaseCommand.create`, silently losing the transaction session.
   */
  @Exclude({ toPlainOnly: true })
  @IsOptional()
  session?: ClientSession | null;
}
