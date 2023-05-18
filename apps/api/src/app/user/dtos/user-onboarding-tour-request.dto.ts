import { ApiProperty } from '@nestjs/swagger';

export class UserOnboardingTourRequestDto {
  @ApiProperty()
  showOnBoardingTour: number;
}
