import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Agent-facing turn body. `say` is spoken verbatim to the person on the phone.
 * Leave it out to listen only (first turn, or a re-call after a timeout).
 * When settling, pass `answer` plus the structured decision for the kind.
 */
export class VoiceTurnRequestDto {
  @ApiPropertyOptional({
    description: 'Words spoken verbatim to the person. Omit to listen only.',
    minLength: 1,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  say?: string;

  @ApiPropertyOptional({
    description: "The person's own words that commit to the answer. Required when settling.",
    minLength: 1,
    maxLength: 4000,
  })
  @ValidateIf((body: VoiceTurnRequestDto) => Boolean(body.decision || body.optionId || body.answer))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer?: string;

  @ApiPropertyOptional({
    description: "For `approve` interactions: 'approve' or 'deny'. Implies hangup.",
    enum: ['approve', 'deny'],
  })
  @IsOptional()
  @IsIn(['approve', 'deny'])
  decision?: 'approve' | 'deny';

  @ApiPropertyOptional({
    description: 'For `choose` interactions: the picked option id. Implies hangup.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  optionId?: string;

  @ApiPropertyOptional({
    description: 'Ask the shell to hang up after speaking `say`. Forced true when settling.',
  })
  @IsOptional()
  @IsBoolean()
  hangup?: boolean;
}

export type VoiceTurnResponseDto = {
  status: 'utterance' | 'ringing' | 'timeout' | 'ended' | 'settled';
  /** Every new person line handed over on this turn, joined for a single-field reader. */
  utterance?: string;
  utterances?: string[];
  endReason?: string;
  interactionStatus?: string;
  /** Present on `settled`: the structured answer the agent recorded. */
  answer?: string;
  decision?: 'approve' | 'deny';
  optionId?: string;
};
