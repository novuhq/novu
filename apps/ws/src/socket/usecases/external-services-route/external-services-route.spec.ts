import * as sinon from 'sinon';
import { EnvironmentRepository, MessageRepository, UserRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { ExternalServicesRoute } from './external-services-route.usecase';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';

const environmentId = EnvironmentRepository.createObjectId();
const userId = UserRepository.createObjectId();

describe('ExternalServicesRoute', () => {
  let externalServicesRoute: ExternalServicesRoute;
  let wsGatewayStub;
  let messageRepository: MessageRepository;
  let findByIdStub: sinon.Stub;
  let getCountStub: sinon.Stub;

  beforeEach(() => {
    findByIdStub = sinon.stub(MessageRepository.prototype, 'findById');
    getCountStub = sinon.stub(MessageRepository.prototype, 'getCount');

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

  afterEach(() => {
    findByIdStub.restore();
    getCountStub.restore();
  });

  it('should send unseen count change when event is "unseen_count_changed"', async () => {
    getCountStub.resolves(Promise.resolve(5));

    await externalServicesRoute.execute(
      ExternalServicesRouteCommand.create({
        event: WebSocketEventEnum.UNSEEN,
        userId,
        _environmentId: environmentId,
        payload: {},
      })
    );

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 5,
      hasMore: false,
    });
  });

  it('should send unread count change when event is "unread_count_changed"', async () => {
    getCountStub.resolves(Promise.resolve(10));

    await externalServicesRoute.execute(
      ExternalServicesRouteCommand.create({
        event: WebSocketEventEnum.UNREAD,
        userId,
        _environmentId: environmentId,
        payload: {},
      })
    );

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 10,
      hasMore: false,
    });
  });

  it('should send general message when event is neither "unseen_count_changed" nor "unread_count_changed"', async () => {
    const messageId = MessageRepository.createObjectId();

    findByIdStub.resolves(Promise.resolve({ _id: messageId }));

    const command: ExternalServicesRouteCommand = {
      event: WebSocketEventEnum.RECEIVED,
      userId,
      payload: { messageId },
    };

    await externalServicesRoute.execute(command);

    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, userId, WebSocketEventEnum.RECEIVED, {
      message: {
        _id: messageId,
      },
    });
  });

  it('should skip getCount query if unseen count provided', async () => {
    getCountStub.resolves(Promise.resolve(10));

    let command: ExternalServicesRouteCommand = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
      payload: { unseenCount: 5 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 5,
      hasMore: false,
    });

    command = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
      payload: { unseenCount: 4 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(1), userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 4,
    });

    getCountStub.resolves(Promise.resolve(20));
    command = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(2), userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 20,
    });

    getCountStub.resolves(Promise.resolve(21));
    command = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
      payload: { unseenCount: undefined },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(3), userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 21,
    });

    getCountStub.resolves(Promise.resolve(22));
    command = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
      payload: { unseenCount: undefined },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(4), userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 22,
    });

    getCountStub.resolves(Promise.resolve(23));
    command = {
      event: WebSocketEventEnum.UNSEEN,
      userId,
      _environmentId: environmentId,
      payload: { unseenCount: 0 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(5), userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: 0,
    });
  });

  it('should skip getCount query if unread count provided', async () => {
    getCountStub.resolves(Promise.resolve(10));

    let command: ExternalServicesRouteCommand = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
      payload: { unreadCount: 5 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledOnceWithExactly(wsGatewayStub.sendMessage, userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 5,
      hasMore: false,
    });

    command = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
      payload: { unreadCount: 4 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(1), userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 4,
    });

    getCountStub.resolves(Promise.resolve(20));
    command = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(2), userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 20,
    });

    getCountStub.resolves(Promise.resolve(21));
    command = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
      payload: { unreadCount: undefined },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(3), userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 21,
    });

    getCountStub.resolves(Promise.resolve(22));
    command = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
      payload: { unreadCount: undefined },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(4), userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 22,
    });

    getCountStub.resolves(Promise.resolve(23));
    command = {
      event: WebSocketEventEnum.UNREAD,
      userId,
      _environmentId: environmentId,
      payload: { unreadCount: 0 },
    };
    await externalServicesRoute.execute(command);
    sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(5), userId, WebSocketEventEnum.UNREAD, {
      unreadCount: 0,
    });
  });
});
