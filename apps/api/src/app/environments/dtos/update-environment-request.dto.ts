import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class InBoundParseDomainDto {
  @ApiPropertyOptional({ type: String })
  inboundParseDomain?: string;
}

export class UpdateEnvironmentRequestDto {
  @ApiProperty()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsOptional()
  identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({
    type: InBoundParseDomainDto,
  })
  dns?: InBoundParseDomainDto;
}
