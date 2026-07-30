import { ClientSession } from '@novu/dal';
import { ResourceTypeEnum } from '@novu/shared';
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
   * Intentionally undecorated and assigned after `BaseCommand.create`.
   * Any decorator emits `design:type = ClientSession`, and even without metadata
   * `plainToInstance` will call `new ClientSession()` when given a session instance —
   * which throws `MongoRuntimeError: ClientSession requires a MongoClient` (NV-8457).
   */
  session?: ClientSession | null;
}
