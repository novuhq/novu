import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponse {
  @ApiProperty()
  signedUrl: string;
  @ApiProperty()
  path: string;
}
