import { ApiProperty } from '@nestjs/swagger';

/** The claim token of the caller’s keyless setup. */
export class KeylessClaimTokenResponseDto {
  @ApiProperty({ description: 'Hand this to `human login` so signing in moves the setup into the operator’s account.' })
  token: string;
}
