import { Module, Provider } from '@nestjs/common';
import {
  DalServiceHealthIndicator,
  IHealthIndicator,
  ReadinessService,
  WebSocketsQueueService,
  WebSocketsQueueServiceHealthIndicator,
} from '@novu/application-generic';
import { WSServerHealthIndicator } from '../socket/services';
import { SharedModule } from '../shared/shared.module';
import { SocketModule } from '../socket/socket.module';

export const indicatorList = {
  provide: 'INDICATOR_LIST',
  useFactory: (
    wsServerHealthIndicator: WSServerHealthIndicator,
    webSocketsQueueServiceHealthIndicator: WebSocketsQueueServiceHealthIndicator,
    dalServiceHealthIndicator: DalServiceHealthIndicator
  ) => {
    const indicators: IHealthIndicator[] = [
      wsServerHealthIndicator,
      webSocketsQueueServiceHealthIndicator,
      dalServiceHealthIndicator,
    ];

    return indicators;
  },
  inject: [WSServerHealthIndicator, WebSocketsQueueServiceHealthIndicator, DalServiceHealthIndicator],
};

const PROVIDERS: Provider[] = [
  WSServerHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  DalServiceHealthIndicator,

  WebSocketsQueueService,

  indicatorList,
  ReadinessService,
];

@Module({
  imports: [SharedModule, SocketModule],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class ReadinessModule {}
