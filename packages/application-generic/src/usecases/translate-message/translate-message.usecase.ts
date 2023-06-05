import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../services';
import { isLanguageSupported } from '../../utils/translate-message';

import { TranslateMessageCommand } from './translate-message.command';

@Injectable()
export class TranslateMessage {
  constructor(private openAiService: OpenAiService) {}

  async execute(command: TranslateMessageCommand) {
    if (!isLanguageSupported(command.language)) {
      throw new Error(`Language ${command.language} is not supported`);
    }

    const prompt = `Translate the following message into ${command.language}:\n\n"${command.messageContent}"`;

    const result = await this.openAiService.translateMessage(prompt);

    return result;
  }
}
