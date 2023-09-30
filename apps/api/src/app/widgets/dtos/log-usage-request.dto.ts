import { ApiProperty } from '@nestjs/swagger';

export class LogUsageRequestDto {
  @ApiProperty({
    example: '[Widget] - Notification Click',
  })
  name: string;
  @ApiProperty({
    example: {
      notificationId: '507f191e810c19729de860ea',
      hasCta: true,
    },
  })
  payload: any;
}
