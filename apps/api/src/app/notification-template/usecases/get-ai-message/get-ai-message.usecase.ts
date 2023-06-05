import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../../../shared/services/openai/openai.service';
import { GetAiMessageCommand } from './get-ai-message.command';

@Injectable()
export class GetAiMessage {
  constructor(private openAiService: OpenAiService) {}

  async execute(command: GetAiMessageCommand): Promise<string> {
    const text = `Please generate an informal text in a div element (inline-style) for an ${command.channel.toLowerCase()} notification with  the context: "${
      command.workflowName
    }, ${command.templateName} with the subject ${command.emailSubject}"
use variables (use "{{" and "}}" without space between them) and subscriber.firstName , subscriber.lastName, organization.name, branding.logo, branding.color, and other variables. no javascript, don't explain what you are doing.`;

    const result = await this.openAiService.createCompletion(text);

    return result.text;
  }
}
