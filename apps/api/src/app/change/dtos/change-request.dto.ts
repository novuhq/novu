import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

export class ChangesRequestDto extends PaginationRequestDto(10, 100) {
  @ApiProperty({
    type: String,
    required: true,
    default: 'false',
  })
  @IsDefined()
  @IsString()
  promoted: string;
}
