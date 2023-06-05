// eslint-disable-next-line @typescript-eslint/naming-convention
import { Injectable } from '@nestjs/common';
import { GetInternationalizationTranslationCommand } from './get-internationalization-translation.comand';
import { UseChatGptCommand, UseChatGptUseCase } from '../use-chat-gpt';

const context = 'PrompSuggestion';

@Injectable()
export class GetTranslationUseCase {
  constructor(private useChatGptUseCase: UseChatGptUseCase) {}
  async create(command: GetInternationalizationTranslationCommand) {
    let prompt = '';

    prompt = `Use [language] value of ${command.language} in our conversation.
Use [source] value of "${command.prompt}" in our conversation.
I want you to act as an [language] translator, spelling corrector and improver.
I will speak to you in any language and you will detect the language,
translate it and answer in the corrected and improved version of my text,
in [language]. Keep the meaning same.
I want you to only reply the correction, the improvements and nothing else,
do not write explanations. My first sentence is [source].`;

    const answer = await this.useChatGptUseCase.execute(
      UseChatGptCommand.create({
        ...command,
        prompt,
      })
    );

    return answer;
  }
}

interface IRecommends {
  score: number;
  content: string;
}
