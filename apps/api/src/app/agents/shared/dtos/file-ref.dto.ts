import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FileRefDto {
  @ApiProperty({
    description: 'Filename shown to the subscriber and used when materializing the attachment.',
    example: 'report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiPropertyOptional({
    description: 'MIME type hint for the attachment (for example, `application/pdf`).',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description:
      'Inline file data as a base64-encoded string. Use for small generated files (up to 5 MB decoded). ' +
      'Provide exactly one of `data` or `url` per file.',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoK',
  })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({
    description:
      'Public HTTP(S) URL Novu fetches server-side. Recommended for larger files (up to 25 MB per file). ' +
      'Provide exactly one of `data` or `url` per file.',
    example: 'https://cdn.example.com/report.pdf',
  })
  @IsOptional()
  @IsString()
  url?: string;
}
