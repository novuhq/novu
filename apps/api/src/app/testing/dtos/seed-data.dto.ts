import { UserEntity } from '@novu/dal';

export class SeedDataBodyDto {}

export interface ISeedDataResponseDto {
  token: string;
  user: UserEntity;
}
