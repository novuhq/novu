import { expect } from 'chai';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AnalyticsService, BullMqService } from '@novu/application-generic';
import { MemberRepository, SubscriberRepository, MessageRepository } from '@novu/dal';

import { SocketModule } from './socket.module';
import { WSGateway } from './ws.gateway';
import { SubscriberOnlineService } from '../shared/subscriber-online';
import { SocketQueueConsumerService } from './services/socket-queue-consumer.service';
import { ExternalServicesRoute } from './usecases/external-services-route';

let socketQueueConsumerService: SocketQueueConsumerService;

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
        SocketQueueConsumerService,
        ExternalServicesRoute,
        MessageRepository,
      ],
    }).compile();
    socketQueueConsumerService = moduleRef.get<SocketQueueConsumerService>(SocketQueueConsumerService);
  });

  it('should instantiate properly the BullMQ service on module init', async () => {
    expect(socketQueueConsumerService).to.exist;

    const bullMqService = socketQueueConsumerService.bullMqService;
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
