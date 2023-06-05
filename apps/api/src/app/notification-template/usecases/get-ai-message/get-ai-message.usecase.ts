import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../../shared/services/openai/openai.service';
import { GetAiMessageCommand } from './get-ai-message.command';

@Injectable()
export class GetAiMessage {
  constructor(private openAiService: OpenAiService) {}

  async execute(command: GetAiMessageCommand): Promise<any> {
    const message = command.prompt;

    let format = `Put the answer in the following JSON structure\n`;
    format += `{
      "title": "string",
      "message": "string",
    }\n`;

    return this.openAiService.createCompletion(message + '\n' + format);
  }
}
