import { IsDefined } from 'class-validator';

export class UpdateEncryptionBodyDto {
  @IsDefined()
  encrypted: string;
}
