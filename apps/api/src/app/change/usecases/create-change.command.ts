import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
import { CommandHelper } from '../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export interface IItem extends Pick<Document, '_id'> {
  [key: string]: any;
}

export class CreateChangeCommand extends EnvironmentWithUserCommand {
  static create(data: CreateChangeCommand) {
    return CommandHelper.create(CreateChangeCommand, data);
  }

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
