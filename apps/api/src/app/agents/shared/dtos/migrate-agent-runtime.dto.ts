import { IsMongoId } from 'class-validator';

export class MigrateAgentRuntimeRequestDto {
  @IsMongoId()
  integrationId: string;
}
