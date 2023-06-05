// eslint-disable-next-line @typescript-eslint/naming-convention
import { PineconeClient } from '@pinecone-database/pinecone';
import { Injectable } from '@nestjs/common';
import { GetNotificationPromptSuggestionCommand } from './get-notification-prompt-suggestion.command';

@Injectable()
export class GetNotificationPromptSuggestionUseCase {
  async execute(command: GetNotificationPromptSuggestionCommand) {
    const pinecone = new PineconeClient();
    await pinecone.init({
      environment: 'us-west4-gcp',
      apiKey: process.env.PINECONE_API_KEY as string,
    });
    console.log('command.prompt', command.prompt);

    const index = pinecone.Index('notifications-mvp');
    const queryRequest = {
      vector: [0.1, 0.2, 0.3, 0.4],
      topK: command.limit,
      includeValues: true,
      includeMetadata: true,
      filter: {
        genre: { $in: ['comedy', 'documentary', 'drama'] },
      },
      namespace: 'poc',
    };
    const queryResponse = await index.query({ queryRequest });

    return queryResponse;
  }
}
