import { ApiProperty } from '@nestjs/swagger';
import { EnvironmentVariableType } from '@novu/shared';

export const SECRET_MASK = '••••••••';

export class EnvironmentVariableValueResponseDto {
  @ApiProperty()
  _environmentId: string;

  @ApiProperty({ description: 'Value is masked (••••••••) for secret variables' })
  value: string;
}

export class EnvironmentVariableResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  key: string;

  @ApiProperty({ enum: EnvironmentVariableType })
  type: EnvironmentVariableType;

  @ApiProperty()
  isSecret: boolean;

  @ApiProperty({ type: [EnvironmentVariableValueResponseDto] })
  values: EnvironmentVariableValueResponseDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
