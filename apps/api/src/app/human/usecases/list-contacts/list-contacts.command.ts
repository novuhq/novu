import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MAX_CONTACTS_LIMIT } from '../../dtos/list-contacts.dto';

export class ListContactsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CONTACTS_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  after?: string;
}
