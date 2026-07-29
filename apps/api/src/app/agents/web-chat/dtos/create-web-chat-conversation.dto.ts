import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWebChatConversationRequestDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreateWebChatConversationResponseDto {
  identifier: string;
}
