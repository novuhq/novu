import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/dal';

export class TestSendEmailRequestDto {
  @IsDefined()
  contentType: 'customHtml' | 'editor';
  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  @IsDefined()
  @IsString()
  subject: string;
  @IsString()
  preheader?: string;
  @IsDefined()
  content: string | IEmailBlock[];
  @IsDefined()
  to: string | string[];
}
