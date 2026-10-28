import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Minimal agent-facing turn body. Settle semantics land in NV-9172. */
export class VoiceTurnRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  line: string;

  @IsOptional()
  @IsBoolean()
  hangup?: boolean;
}

export type VoiceTurnResponseDto = {
  status: 'utterance' | 'ended' | 'timeout';
  /** Every new person line since this turn was posted, joined for a single-field reader. */
  utterance?: string;
  utterances?: string[];
  endReason?: string;
  interactionStatus?: string;
};
