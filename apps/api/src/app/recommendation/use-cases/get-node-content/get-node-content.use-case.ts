// eslint-disable-next-line @typescript-eslint/naming-convention

import { TopicEntity, TopicRepository } from '@novu/dal';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { GetAdvancedNodeContentCommand, GetNodeContentCommand } from './get-node-content.command';
import { UseChatGptCommand, UseChatGptUseCase } from '../use-chat-gpt';

@Injectable()
export class GetNodeContentUseCase {
  constructor(private useChatGptUseCase: UseChatGptUseCase) {}
  async execute(command: GetNodeContentCommand) {
    if (!command.channel) throw new BadRequestException('No Channel was found, channel is a mandatory parameter.');
    if (!command.description && !command.title)
      throw new BadRequestException(
        'No description and no title were found, at least one of the parameters is mandatory'
      );

    let prompt = '';

    prompt = `
    I want to generate personalized notification content for a specific channel.
Please generate me exactly 3 notifications examples.

This must be true:
The subject of the content being generatd must be the same subject of this:
${command.description || command.title}

Follow these instructions step by step:
1. Do not write normal text. Dont use \\n . Avoid  special character and unneeded spaces.
2. Do not add intro.
3. Create exactly 3 examples similar to:
${command.description || command.title}
4. Each example should have title and content.
5. Content must have ${
      command.channel
    } format, including all the best standrads as well as the content and character limits.
6.Content must include variables. Variables should be wrapped in double curly braces {{}}. 
7. Some variables examples are {{subscriber.firstName}}, {{subscriber.lastName}}, {{subscriber.email}}, {{subscriber.phone}}, {{subscriber.avatar}}, {{subscriber.locale}}, {{subscriber.subscriberId}}, {{postName}, {{inviteDate}}, {{subscriberName}}, {{eventName}}, {{commentorName}}, {{taskName}},
, more generally varialbes, can be based on names, dates, communication types, action types, and other classification, varialbes are written camel-case.
8. Content should be in a semi-casual tone of voice.
9. Example must be organized in a JSON array format.
10. Each elemnt in the array will look like this. {title: generated title, content generated content}


    `;

    const answer = await this.useChatGptUseCase.execute(
      UseChatGptCommand.create({
        ...command,
        prompt,
      })
    );

    return answer;
  }

  async advancedExecute(command: GetAdvancedNodeContentCommand) {
    if (!command.channel) throw new BadRequestException('No Channel was found, channel is a mandatory parameter.');
    if (!command.description && !command.title)
      throw new BadRequestException(
        'No description and no title were found, at least one of the parameters is mandatory'
      );

    let prompt = '';

    let test = '';

    for (const value in command.messages) {
      test += `- ${value}`;
    }

    prompt = `
    I want to generate personalized notification content for a specific channel.
Please generate me exactly 3 notifications examples that are similar to:
${test}

This must be true:
The subject of the content being generatd must be the same subject of this:
${command.description || command.title}

Follow these instructions step by step:
1. Do not write normal text. Dont use \\n . Avoid  special character and unneeded spaces.
2. Do not add intro.
3. Create exactly 3 examples similar to:
${command.description || command.title}
4. Each example should have title and content.
5. Content must have ${
      command.channel
    } format, including all the best standrads as well as the content and character limits.
6.Content must include variables. Variables should be wrapped in double curly braces {{}}. 
7. Some variables examples are {{subscriber.firstName}}, {{subscriber.lastName}}, {{subscriber.email}}, {{subscriber.phone}}, {{subscriber.avatar}}, {{subscriber.locale}}, {{subscriber.subscriberId}}, {{postName}, {{inviteDate}}, {{subscriberName}}, {{eventName}}, {{commentorName}}, {{taskName}},
, more generally varialbes, can be based on names, dates, communication types, action types, and other classification, varialbes are written camel-case.
8. Content should be in a semi-casual tone of voice.
9. Example must be organized in a JSON array format.
10. Each elemnt in the array will look like this. {title: generated title, content generated content}


    `;

    const answer = await this.useChatGptUseCase.execute(
      UseChatGptCommand.create({
        ...command,
        prompt,
      })
    );

    return answer;
  }
}
