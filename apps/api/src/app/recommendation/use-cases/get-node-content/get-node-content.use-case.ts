// eslint-disable-next-line @typescript-eslint/naming-convention

import { TopicEntity, TopicRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { GetNodeContentCommand } from './get-node-content.command';
import { UseChatGptCommand, UseChatGptUseCase } from '../use-chat-gpt';

@Injectable()
export class GetNodeContentUseCase {
  constructor(private useChatGptUseCase: UseChatGptUseCase) {}
  async execute(command: GetNodeContentCommand) {
    let prompt = '';

    if (command.prompt) prompt = command.prompt;
    if (command.title) prompt = command.title;
    if (command.description) prompt = command.description;
    if (command.channel) prompt += command.channel;

    prompt = `return top 10 examples in JSON format for notification content with similar content to ${prompt}`;

    console.log(prompt);
    const answer = await this.useChatGptUseCase.execute(
      UseChatGptCommand.create({
        ...command,
        prompt,
      })
    );

    console.log(answer);

    return answer;
  }
}
