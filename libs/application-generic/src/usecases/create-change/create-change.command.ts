import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
import { EnvironmentWithUserCommand } from '../../commands';

export interface IItem extends Pick<Document, '_id'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
