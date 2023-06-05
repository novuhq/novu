// eslint-disable-next-line @typescript-eslint/naming-convention
import { PineconeClient } from '@pinecone-database/pinecone';
import { Injectable, Logger } from '@nestjs/common';
import { GetNotificationPromptSuggestionCommand } from './get-notification-prompt-suggestion.command';
import { embedder } from '../embedding';

const context = 'PrompSuggestion';

@Injectable()
export class GetNotificationPromptSuggestionUseCase {
  async execute(command: GetNotificationPromptSuggestionCommand) {
    const pinecone = new PineconeClient();
    await pinecone.init({
      environment: 'us-west4-gcp',
      apiKey: process.env.PINECONE_API_KEY as string,
    });
    Logger.log('command.prompt', command.prompt, context);

    const index = pinecone.Index('notifications-mvp');

    await embedder.init();

    // Embed the query
    const queryEmbedding = await embedder.embed(command.prompt);

    const queryRequest = {
      vector: queryEmbedding.values,
      topK: command.limit,
      includeValues: true,
      includeMetadata: true,
      namespace: 'test',
    };

    const resp = await index.query({ queryRequest });

    const returnValues: IRecommends[] =
      resp.matches === undefined
        ? ([] as unknown as IRecommends[])
        : resp.matches.reduce<IRecommends[]>((acc: IRecommends[], element) => {
            acc.push({
              score: element.score ?? 0,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              content: element.metadata?.notification,
            });

            return acc;
          }, []);

    Logger.log('Count recommendations: ', returnValues.length, context);

    return returnValues;
  }
}

interface IRecommends {
  score: number;
  content: string;
}
