import { Injectable, OnModuleInit } from '@nestjs/common';
import { Configuration, OpenAIApi } from 'openai';
import { ApiException } from '../../utils/exceptions';

@Injectable()
export class OpenAiService implements OnModuleInit {
  private openAi: OpenAIApi;

  async onModuleInit() {
    const configuration = new Configuration({
      apiKey: process.env.OPEN_AI_SECRET_KEY,
    });

    this.openAi = new OpenAIApi(configuration);
  }

  async translateMessage(prompt: string) {
    try {
      const completion = await this.openAi.createCompletion({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.3,
        max_tokens: 100,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });

      return completion.data.choices[0].text;
    } catch (error: any) {
      if (error.response) {
        throw new ApiException(error.response.data);
      } else {
        throw new ApiException(error.message);
      }
    }
  }
}
