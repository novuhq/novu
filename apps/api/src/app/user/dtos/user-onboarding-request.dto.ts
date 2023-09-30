import { ApiProperty } from '@nestjs/swagger';

export class UserOnboardingRequestDto {
  @ApiProperty()
  showOnBoarding: boolean;
}
