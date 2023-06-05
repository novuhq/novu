// eslint-disable-next-line @typescript-eslint/naming-convention
import { PineconeClient } from '@pinecone-database/pinecone';
import { Injectable, Logger } from '@nestjs/common';
import { GetTitleSuggestionCommand } from './get-title-suggestion.command';
import { embedder } from '../embedding';
import { UseChatGptCommand, UseChatGptUseCase } from '../use-chat-gpt';

const context = 'TitlePromptSuggestion';

@Injectable()
export class GetTitleSuggestionUseCase {
  constructor(private useChatGptUseCase: UseChatGptUseCase) {}
  async execute(command: GetTitleSuggestionCommand) {
    let prompt = '';

    prompt = `I want you to act as a title generator for notification workflows.
    I will provide you with a description and a list of actions that are happening in the workflow and you will generate 1 attention-grabbing title.
    Please keep the title concise and under 10 words, and ensure that the meaning is maintained.
    Replies will utilize the ${command.language} language with an appropriate language grammar.
    My description is ${command.description} and the list is:\n`;

    for (const value in command.titles) {
      prompt += `- ${value}`;
    }

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
