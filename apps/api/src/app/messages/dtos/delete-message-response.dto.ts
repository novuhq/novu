import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class DeleteMessageResponseDto {
  @ApiProperty({
    description: 'A boolean stating the success of the action',
  })
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty({
    description: 'The status enum for the performed action',
    enum: ['deleted'],
  })
  @IsString()
  @IsDefined()
  status: string;
}
