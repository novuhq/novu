import { IsDefined, IsString } from 'class-validator';

export class RenameOrganizationDto {
  @IsString()
  @IsDefined()
  name: string;
}
