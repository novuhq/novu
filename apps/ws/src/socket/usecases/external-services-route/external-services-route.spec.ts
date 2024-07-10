import * as sinon from 'sinon';
import { EnvironmentRepository, MessageEntity, MessageRepository, UserRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { ExternalServicesRoute } from './external-services-route.usecase';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';

const environmentId = EnvironmentRepository.createObjectId();
const messageId = 'message-id-1';
const userId = UserRepository.createObjectId();

const commandReceivedMessage = ExternalServicesRouteCommand.create({
  event: WebSocketEventEnum.RECEIVED,
  userId,
  _environmentId: environmentId,
  payload: {
    message: {
      _id: messageId,
      _environmentId: environmentId,
      // etc...
    } as MessageEntity,
  },
});

const createWsGatewayStub = (result) => {
  return {
    sendMessage: sinon.stub(),
    server: {
      in: sinon.stub().returns({
        fetchSockets: sinon.stub().resolves(result),
      }),
    },
  } as WSGateway;
};

describe('ExternalServicesRoute', () => {
  let externalServicesRoute: ExternalServicesRoute;
  let wsGatewayStub;
  let findOneStub: sinon.Stub;
  let getCountStub: sinon.Stub;
  const messageRepository = new MessageRepository();

  beforeEach(() => {
    findOneStub = sinon.stub(MessageRepository.prototype, 'findOne');
    getCountStub = sinon.stub(MessageRepository.prototype, 'getCount');
  });

  afterEach(() => {
    findOneStub.restore();
    getCountStub.restore();
  });

  describe('User is not online', () => {
    beforeEach(() => {
      wsGatewayStub = createWsGatewayStub([]);
      externalServicesRoute = new ExternalServicesRoute(wsGatewayStub, messageRepository);
    });

    it('should not send any message to the web socket if user is not online', async () => {
      getCountStub.resolves(Promise.resolve(5));

      await externalServicesRoute.execute(commandReceivedMessage);

      sinon.assert.calledOnceWithExactly(wsGatewayStub.server.in, userId);
      sinon.assert.calledOnceWithExactly(wsGatewayStub.server.in(userId).fetchSockets);
      sinon.assert.notCalled(wsGatewayStub.sendMessage);
    });
  });

  describe('User is online', () => {
    beforeEach(() => {
      wsGatewayStub = createWsGatewayStub([{ id: 'socket-id' }]);
      externalServicesRoute = new ExternalServicesRoute(wsGatewayStub, messageRepository);
      findOneStub.resolves(Promise.resolve({ _id: messageId }));
    });

    it('should send message, unseen count and unread count change when event is received', async () => {
      getCountStub.resolves(Promise.resolve(5));

      await externalServicesRoute.execute(commandReceivedMessage);

      sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(0), userId, WebSocketEventEnum.RECEIVED, {
        message: {
          _id: messageId,
        },
      });
      sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(1), userId, WebSocketEventEnum.UNSEEN, {
        unseenCount: 5,
        hasMore: false,
      });
      sinon.assert.calledWithMatch(wsGatewayStub.sendMessage.getCall(2), userId, WebSocketEventEnum.UNREAD, {
        unreadCount: 5,
        hasMore: false,
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
});
