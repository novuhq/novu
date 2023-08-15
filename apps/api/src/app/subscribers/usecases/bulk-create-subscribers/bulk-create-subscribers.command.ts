import { IsArray, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';
import { CreateSubscriberRequestDto } from '../../dtos';

export class BulkCreateSubscribersCommand extends EnvironmentCommand {
  @IsArray()
  @ValidateNested()
  subscribers: CreateSubscriberRequestDto[];
}
