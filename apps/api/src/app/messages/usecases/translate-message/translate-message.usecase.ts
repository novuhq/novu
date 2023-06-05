import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../../shared/services/openai/openai.service';
import { TranslateMessageCommand } from './translate-message.command';

@Injectable()
export class TranslateMessage {
  constructor(private openAiService: OpenAiService) {}

  async execute(command: TranslateMessageCommand) {
    const prompt = `Translate the following message into ${command.language}:\n\n"${command.messageContent}"`;

    const result = await this.openAiService.translateMessage(prompt);

    return result;
  }
}
