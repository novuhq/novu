import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EventPattern, MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern('greeting')
  getGreetingMessage(name: string): string {
    console.log(name, 'not s');

    return `Hello ${name}`;
  }

  @MessagePattern('greeting-async')
  async getGreetingMessageAysnc(name: string): Promise<string> {
    console.log(name, 'HAHA');

    return `Hello ${name} Async`;
  }

  @MessagePattern('my-first-topic') // Our topic name
  async handleBookCreatedEvent(data: Record<string, unknown>) {
    console.log(data);
  }
}
