import sinon from 'sinon';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { Types } from 'mongoose';
import { ExternalServicesRoute } from './external-services-route.usecase';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';
import { CloudflareWebSocketService } from '../../services/cloudflare-websocket.service';

const environmentId = new Types.ObjectId().toString();
const organizationId = new Types.ObjectId().toString();
const messageId = 'message-id-1';
const userId = new Types.ObjectId().toString();
const subscriberId = 'subscriber-id-1';

const commandReceivedMessage = ExternalServicesRouteCommand.create({
  event: WebSocketEventEnum.RECEIVED,
  userId,
  _environmentId: environmentId,
  _organizationId: organizationId,
  subscriberId,
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

const createCloudflareWebSocketServiceStub = () => {
  return {
    sendMessage: sinon.stub(),
    isEnabled: sinon.stub().returns(true),
  } as CloudflareWebSocketService;
};

describe('ExternalServicesRoute', () => {
  let externalServicesRoute: ExternalServicesRoute;
  let wsGatewayStub;
  let cloudflareWebSocketServiceStub;
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
      cloudflareWebSocketServiceStub = createCloudflareWebSocketServiceStub();
      externalServicesRoute = new ExternalServicesRoute(
        wsGatewayStub,
        messageRepository,
        cloudflareWebSocketServiceStub
      );
    });

    it('should not send any message to the web socket if user is not online', async () => {
      getCountStub.resolves(Promise.resolve(5));

      await externalServicesRoute.execute(commandReceivedMessage);

      sinon.assert.calledOnceWithExactly(wsGatewayStub.server.in, userId);
      sinon.assert.calledOnceWithExactly(wsGatewayStub.server.in(userId).fetchSockets);
      sinon.assert.notCalled(wsGatewayStub.sendMessage);
      sinon.assert.notCalled(cloudflareWebSocketServiceStub.sendMessage);
    });
  });

  describe('User is online', () => {
    beforeEach(() => {
      wsGatewayStub = createWsGatewayStub([{ id: 'socket-id' }]);
      cloudflareWebSocketServiceStub = createCloudflareWebSocketServiceStub();
      externalServicesRoute = new ExternalServicesRoute(
        wsGatewayStub,
        messageRepository,
        cloudflareWebSocketServiceStub
      );
      findOneStub.resolves(Promise.resolve({ _id: messageId }));
    });

    it('should send message, unseen count and unread count change when event is received to both Socket.io and Cloudflare', async () => {
      getCountStub.resolves(Promise.resolve(5));

      await externalServicesRoute.execute(commandReceivedMessage);

      // Verify Socket.io calls
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

      // Verify Cloudflare calls
      sinon.assert.calledWithMatch(
        cloudflareWebSocketServiceStub.sendMessage.getCall(0),
        userId,
        WebSocketEventEnum.RECEIVED,
        {
          message: {
            _id: messageId,
          },
        },
        organizationId,
        environmentId,
        subscriberId
      );
      sinon.assert.calledWithMatch(
        cloudflareWebSocketServiceStub.sendMessage.getCall(1),
        userId,
        WebSocketEventEnum.UNSEEN,
        {
          unseenCount: 5,
          hasMore: false,
        },
        organizationId,
        environmentId,
        subscriberId
      );
      sinon.assert.calledWithMatch(
        cloudflareWebSocketServiceStub.sendMessage.getCall(2),
        userId,
        WebSocketEventEnum.UNREAD,
        {
          unreadCount: 5,
          hasMore: false,
        },
        organizationId,
        environmentId,
        subscriberId
      );
    });
  });
});
