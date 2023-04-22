import { ChannelTypeEnum } from '@novu/shared';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { Transform } from 'class-transformer';

export class GetMessagesCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsOptional()
  subscriberId?: string;

  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsNumber()
  limit: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (isNaN(value) || value == null) {
      // todo update the limit default to 100 to in version 0.16
      return 1000;
    }

    return value;
  })
  @Min(1)
  @Max(1000)
  countLimit?: number;
}
