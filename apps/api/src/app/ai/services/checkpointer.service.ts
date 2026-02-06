import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DalService } from '@novu/dal';

@Injectable()
export class CheckpointerService implements OnModuleInit {
  private checkpointer!: MongoDBSaver;

  public constructor(private readonly dalService: DalService) {}

  public async onModuleInit(): Promise<void> {
    const client = this.dalService.connection.getClient();
    this.checkpointer = new MongoDBSaver({ client } as any);
  }

  public getCheckpointer(): MongoDBSaver {
    return this.checkpointer;
  }
}
