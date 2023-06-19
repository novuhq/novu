import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsMongoId } from 'class-validator';

export class RemoveAllMessagesDto {
  @ApiPropertyOptional({
    description: 'FeedId to remove messages from',
  })
  @IsMongoId({ message: 'FeedId must be a valid MongoDB ObjectId' })
  @IsOptional()
  feedId: string;
}
