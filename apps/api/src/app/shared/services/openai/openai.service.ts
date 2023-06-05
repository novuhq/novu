import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ChatGPTAPI } from 'chatgpt';

@Injectable()
export class OpenAiService implements OnModuleInit {
  private _api: ChatGPTAPI;

  async onModuleInit() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { ChatGPTAPI: chat } = await (eval(`import('chatgpt')`) as Promise<{
      default: typeof ChatGPTAPI;
    }>);

    this._api = new chat({
      apiKey: process.env.OPEN_AI,
    });
  }

  async createCompletion<T>(prompt: string): Promise<any> {
    const req = await this._api.sendMessage(prompt);

    return JSON.stringify(req, null, 2);
  }
}
