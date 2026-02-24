import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DalService } from '@novu/dal';

@Injectable()
export class CheckpointerService implements OnModuleInit {
  private checkpointer: MongoDBSaver;

  public constructor(private readonly dalService: DalService) {}

  public async onModuleInit(): Promise<void> {
    const client = this.dalService.connection.getClient();
    this.checkpointer = new MongoDBSaver({ client } as any);
  }

  public getCheckpointer(): MongoDBSaver {
    if (!this.checkpointer) throw new Error('CheckpointerService not initialized');

    return this.checkpointer;
  }

  public async deleteThread(threadId: string): Promise<void> {
    await this.checkpointer.deleteThread(threadId);
  }

  public async updateUserMessage(chatId: string, checkpointId: string | undefined, message: string): Promise<void> {
    const checkpointer = this.getCheckpointer();
    const config = { configurable: { thread_id: chatId, checkpoint_id: checkpointId } };
    const checkpointTuple = await checkpointer.getTuple(config);
    const checkpoint = checkpointTuple?.checkpoint;
    const metadata = checkpointTuple?.metadata;

    if (!checkpoint || !metadata) return;

    const messages = checkpoint.channel_values?.messages;
    if (!Array.isArray(messages)) return;

    const lastHumanMessage = [...messages].reverse().find((msg) => msg.type === 'human');
    if (!lastHumanMessage) return;

    lastHumanMessage.content = message;

    await checkpointer.put(config, checkpoint, metadata);
  }
}
