import { IsDefined, IsMongoId, IsOptional } from 'class-validator';

export class CreateEnvironmentBodyDto {
  @IsDefined()
  name: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
