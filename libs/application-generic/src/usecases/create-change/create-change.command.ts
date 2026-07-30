import { ClientSession } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
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
   * Exclude session from serialized output only (`toPlainOnly`). A bare
   * `@Exclude()` would also strip it during `plainToInstance` inside
   * `BaseCommand.create`, silently losing the transaction session.
   */
  @Exclude({ toPlainOnly: true })
  @IsOptional()
  session?: ClientSession | null;
}
