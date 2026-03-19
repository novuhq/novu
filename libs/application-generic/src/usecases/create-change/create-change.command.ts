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
}
