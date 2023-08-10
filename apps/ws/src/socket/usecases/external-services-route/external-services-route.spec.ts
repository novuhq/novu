import * as sinon from 'sinon';
import { MessageRepository } from '@novu/dal';
import { ExternalServicesRoute } from './external-services-route.usecase';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';

describe('ExternalServicesRoute', () => {
  let externalServicesRoute: ExternalServicesRoute;
  let wsGatewayStub: WSGateway;
  let messageRepository: MessageRepository;

  beforeEach(() => {
    wsGatewayStub = {
      sendMessage: sinon.stub(),
      server: {
        sockets: {
          in: sinon.stub().returns({
            fetchSockets: sinon.stub().resolves([{ id: 'socketId' }]),
          }),
        },
      },
    } as WSGateway;

    messageRepository = new MessageRepository();

    externalServicesRoute = new ExternalServicesRoute(wsGatewayStub, messageRepository);
  });

  it('should send unseen count change when event is "unseen_count_changed"', async () => {
    const messageRepositoryStub = sinon.stub(MessageRepository.prototype, 'getCount').resolves(Promise.resolve(5));

    await externalServicesRoute.execute(
      ExternalServicesRouteCommand.create({
        event: 'unseen_count_changed',
        userId: 'userId',
        _environmentId: 'envId',
        payload: {},
      })
    );

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, 'userId', 'unseen_count_changed', {
      unseenCount: 5,
    });

    messageRepositoryStub.restore();
  });

  it('should send unread count change when event is "unread_count_changed"', async () => {
    const messageRepositoryStub = sinon.stub(MessageRepository.prototype, 'getCount').resolves(Promise.resolve(10));

    await externalServicesRoute.execute(
      ExternalServicesRouteCommand.create({
        event: 'unread_count_changed',
        userId: 'userId',
        _environmentId: 'envId',
        payload: {},
      })
    );

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, 'userId', 'unread_count_changed', {
      unreadCount: 10,
    });

    messageRepositoryStub.restore();
  });

  it('should send general message when event is neither "unseen_count_changed" nor "unread_count_changed"', async () => {
    const messageRepositoryStub = sinon.stub(MessageRepository.prototype, 'getCount').resolves(Promise.resolve(10));

    const command: ExternalServicesRouteCommand = {
      event: 'notification_received',
      userId: 'userId',
      payload: { data: 'payloadData' },
    };

    await externalServicesRoute.execute(command);

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, 'userId', 'notification_received', {
      data: 'payloadData',
    });

    messageRepositoryStub.restore();
  });
});
