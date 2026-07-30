import { ClientSession } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export interface IItem {
  _id?: string;
  [key: string]: any;
}

export class CreateChangeCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  item: IItem;

  @IsDefined()
  @IsString()
  type: ChangeEntityTypeEnum;

  @IsMongoId()
  changeId: string;

  @IsMongoId()
  @IsOptional()
  parentChangeId?: string;

  /**
   * Intentionally undecorated and assigned after `BaseCommand.create`.
   * Any decorator emits `design:type = ClientSession`, and even without metadata
   * `plainToInstance` will call `new ClientSession()` when given a session instance —
   * which throws `MongoRuntimeError: ClientSession requires a MongoClient` (NV-8457).
   */
  session?: ClientSession | null;
}
