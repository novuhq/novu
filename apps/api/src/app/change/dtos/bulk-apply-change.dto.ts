import { IsString } from 'class-validator';

export class BulkApplyChangeDto {
  @IsString({ each: true })
  changeIds: string[];
}
