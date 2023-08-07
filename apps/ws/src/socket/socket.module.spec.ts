import { expect } from 'chai';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AnalyticsService, BullMqService } from '@novu/application-generic';
import { MemberRepository, SubscriberRepository } from '@novu/dal';

import { SocketModule } from './socket.module';
import { WSGateway } from './ws.gateway';

import { SubscriberOnlineService } from '../shared/subscriber-online';

let socketModule: SocketModule;

describe('Socket Module', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SocketModule],
      providers: [
        WSGateway,
        BullMqService,
        JwtService,
        AnalyticsService,
        SubscriberOnlineService,
        MemberRepository,
        SubscriberRepository,
      ],
    }).compile();
    socketModule = moduleRef.get<SocketModule>(SocketModule);
  });

  it('should instantiate properly the BullMQ service on module init', async () => {
    expect(socketModule).to.exist;
    await socketModule.onModuleInit();

    const bullMqService = socketModule.bullMqService;
    expect(await bullMqService.getRunningStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'ws_socket_queue',
      workerIsRunning: true,
    });
    expect(bullMqService.worker.opts).to.deep.include({
      concurrency: 5,
      lockDuration: 90000,
    });
    expect(bullMqService.worker.opts.connection).to.deep.include({
      host: 'localhost',
      port: 6379,
    });
  });
});
