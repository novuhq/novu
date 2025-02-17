import { ApiProperty } from '@nestjs/swagger';

export class RemoveSubscriberResponseDto {
  @ApiProperty({
    description: 'Indicates whether the operation was acknowledged by the server',
    example: true,
  })
  acknowledged: boolean;

  @ApiProperty({
    description: 'Status of the subscriber removal operation',
    example: 'success',
  })
  status: string;
}
