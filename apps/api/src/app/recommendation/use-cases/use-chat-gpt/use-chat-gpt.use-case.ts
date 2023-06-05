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
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: command.prompt }],
      });

      const answer = completion.data?.choices;

      if (answer[0].message.content) {
        try {
          const jsonArrayAnswer = JSON.parse(answer[0].message.content);

          return jsonArrayAnswer;
        } catch (error) {
          return answer;
        }
      }
    } catch (error) {
      if (error.response) {
        return 'error';
      } else {
        return 'error';
      }
    }
  }
}
