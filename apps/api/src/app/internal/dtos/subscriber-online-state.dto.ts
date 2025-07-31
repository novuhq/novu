import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriberOnlineStateRequestDto {
  @ApiProperty({
    description: 'Whether the subscriber is online',
    example: true,
  })
  @IsBoolean()
  isOnline: boolean;

  @ApiProperty({
    description: 'Optional timestamp of the state change',
    example: 1234567890,
    required: false,
  })
  @IsOptional()
  timestamp?: number;
}

export class UpdateSubscriberOnlineStateResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Optional message',
    example: 'Subscriber online state updated successfully',
    required: false,
  })
  message?: string;
}
