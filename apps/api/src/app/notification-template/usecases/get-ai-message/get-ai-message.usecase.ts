import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../../shared/services/openai/openai.service';
import { GetAiMessageCommand } from './get-ai-message.command';

@Injectable()
export class GetAiMessage {
  constructor(private openAiService: OpenAiService) {}

  async execute(command: GetAiMessageCommand): Promise<any> {
    const message = command.prompt;

    return this.openAiService.createCompletion(message);
  }
}
