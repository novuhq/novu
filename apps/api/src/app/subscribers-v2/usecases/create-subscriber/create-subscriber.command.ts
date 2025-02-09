import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { CreateSubscriberRequestDto } from '../../dtos/create-subscriber.dto';

export class CreateSubscriberCommand extends EnvironmentCommand {
  @ValidateNested()
  @Type(() => CreateSubscriberRequestDto)
  createSubscriberRequestDto: CreateSubscriberRequestDto;
}
