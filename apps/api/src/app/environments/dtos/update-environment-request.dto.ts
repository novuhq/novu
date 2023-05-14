import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class InBoundParseDomainDto {
  @ApiPropertyOptional({ type: String })
  inboundParseDomain?: string;
}

export class UpdateEnvironmentRequestDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
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
