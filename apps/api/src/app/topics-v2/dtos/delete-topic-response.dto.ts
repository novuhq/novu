import { ApiProperty } from '@nestjs/swagger';

export class DeleteTopicResponseDto {
  @ApiProperty({
    description: 'Indicates if the operation was acknowledged',
    example: true,
  })
  acknowledged: boolean;
}
