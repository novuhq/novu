// eslint-disable-next-line @typescript-eslint/naming-convention
const { Configuration, OpenAIApi } = require('openai');
import { TopicEntity, TopicRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { UseChatGptCommand } from './use-chat-gpt.command';
const configuration = new Configuration({
  apiKey: process.env.OPEN_API_KEY,
});

const openai = new OpenAIApi(configuration);

@Injectable()
export class UseChatGptUseCase {
  async execute(command: UseChatGptCommand) {
    try {
      console.log('command.prompt', command.prompt);
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: command.prompt }],
      });
      console.log(completion.data);

      return completion.data?.choices;
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data.message);

        return 'error';
      } else {
        console.log(error.message);

        return 'error';
      }
    }
  }
}
