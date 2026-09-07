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
   * Intentionally undecorated. Pass via `BaseCommand.create(data, { session })` —
   * putting a ClientSession through `plainToInstance` calls `new ClientSession()` and
   * throws `MongoRuntimeError: ClientSession requires a MongoClient` (NV-8457).
   */
  session?: ClientSession | null;
}
