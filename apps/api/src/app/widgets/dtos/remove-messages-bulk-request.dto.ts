import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class RemoveMessagesBulkRequestDto {
  @ApiProperty({
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ArrayMaxSize(100)
  messageIds: string[];
}
