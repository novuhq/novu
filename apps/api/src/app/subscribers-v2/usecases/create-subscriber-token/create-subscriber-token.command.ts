import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { CreateSubscriberTokenRequestDto } from '../../dtos/create-subscriber-token.dto';

export class CreateSubscriberTokenCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateSubscriberTokenRequestDto)
  readonly request: CreateSubscriberTokenRequestDto;
}
