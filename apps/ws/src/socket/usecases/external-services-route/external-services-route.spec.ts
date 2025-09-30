import { FeatureFlagsService } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { Types } from 'mongoose';
import sinon from 'sinon';
import { WSGateway } from '../../ws.gateway';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { ExternalServicesRoute } from './external-services-route.usecase';

const environmentId = new Types.ObjectId().toString();
const messageId = 'message-id-1';
const userId = new Types.ObjectId().toString();

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
  let featureFlagsServiceMock;
  let findOneStub: sinon.Stub;
  let getCountStub: sinon.Stub;
  const messageRepository = new MessageRepository();

  beforeEach(() => {
    findOneStub = sinon.stub(MessageRepository.prototype, 'findOne');
    getCountStub = sinon.stub(MessageRepository.prototype, 'getCount');
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);
  });

  afterEach(() => {
    findOneStub.restore();
    getCountStub.restore();
  });

  describe('User is not online', () => {
    beforeEach(() => {
      wsGatewayStub = createWsGatewayStub([]);
      externalServicesRoute = new ExternalServicesRoute(wsGatewayStub, messageRepository, featureFlagsServiceMock);
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
      externalServicesRoute = new ExternalServicesRoute(wsGatewayStub, messageRepository, featureFlagsServiceMock);
      findOneStub.resolves(Promise.resolve({ _id: messageId }));
    });

    it('should send message, unseen count and unread count change when event is received to Socket.io', async () => {
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
    });
  });
});
