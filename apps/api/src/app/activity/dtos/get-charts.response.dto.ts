import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { ReportTypeEnum } from './shared.dto';

export class ChartDataPointDto {
  @ApiProperty({ description: 'Chart data point timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'In-app (Inbox) delivery count' })
  @IsNumber()
  inApp: number;

  @ApiProperty({ description: 'Email delivery count' })
  @IsNumber()
  email: number;

  @ApiProperty({ description: 'SMS delivery count' })
  @IsNumber()
  sms: number;

  @ApiProperty({ description: 'Chat delivery count' })
  @IsNumber()
  chat: number;

  @ApiProperty({ description: 'Push delivery count' })
  @IsNumber()
  push: number;
}

export class GetChartsResponseDto {
  @ApiProperty({ description: 'Chart sections', type: ChartDataPointDto })
  @ValidateNested()
  data: Record<ReportTypeEnum, ChartDataPointDto[]>;
}
