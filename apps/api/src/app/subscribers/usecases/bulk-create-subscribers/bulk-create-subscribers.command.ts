import { ArrayMaxSize, ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { CreateSubscriberRequestDto } from '../../dtos';

export class BulkCreateSubscribersCommand extends EnvironmentCommand {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateSubscriberRequestDto)
  subscribers: CreateSubscriberRequestDto[];
}
