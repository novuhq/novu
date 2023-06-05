// eslint-disable-next-line @typescript-eslint/naming-convention

import { TopicEntity, TopicRepository } from '@novu/dal';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { GetNodeTranslationCommand } from './get-node-translation.command';
import { UseChatGptCommand, UseChatGptUseCase } from '../use-chat-gpt';

@Injectable()
export class GetNodeTranslationUseCase {
  constructor(private useChatGptUseCase: UseChatGptUseCase) {}
  async execute(command: GetNodeTranslationCommand) {
    const prompt = `
    Use [language] value of ${command.dstLanguage} in our conversation.
Use [source] value of “${command.prompt}” in our conversation.
I want you to act as an [language] translator, spelling corrector and improver. I will speak to you in any language and you will detect the language, translate it and answer in the corrected and improved version of my text, in [language]. Keep the meaning same, but make them more literary. I want you to only reply the correction, the improvements and nothing else, do not write explanations. If you have an improvement or a correction reply only that. Do not reply the original source. My first sentence is [source].

`;

    try {
      const answer = await this.useChatGptUseCase.execute(
        UseChatGptCommand.create({
          ...command,
          prompt,
        })
      );

      return answer[0]?.message?.content;
    } catch (error) {
      throw new BadRequestException(`Malformed request, answer from AI is ${error}.`);
    }
  }
}
