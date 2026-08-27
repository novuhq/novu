import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { HumanRelayRuntime } from './human-relay.runtime';

describe('HumanRelayRuntime', () => {
  function setup() {
    const inbound = {
      tryHandleAction: sinon.stub().resolves({ handled: true }),
      tryHandleMessage: sinon.stub().resolves({ handled: true }),
    };
    const logger = { setContext: sinon.stub() };
    const runtime = new HumanRelayRuntime(inbound as any, logger as any);

    return { runtime, inbound };
  }

  it('settles human actions in relay mode', async () => {
    const { runtime, inbound } = setup();
    const turn = { event: AgentEventEnum.ON_ACTION, action: { id: 'human:hi_1:approve' } };

    await runtime.dispatch(turn as any);

    expect(inbound.tryHandleAction.calledOnceWith(turn, 'relay')).to.equal(true);
    expect(inbound.tryHandleMessage.called).to.equal(false);
  });

  it('settles human messages in relay mode', async () => {
    const { runtime, inbound } = setup();
    const turn = { event: AgentEventEnum.ON_MESSAGE, message: { text: 'staging' } };

    await runtime.dispatch(turn as any);

    expect(inbound.tryHandleMessage.calledOnceWith(turn, 'relay')).to.equal(true);
    expect(inbound.tryHandleAction.called).to.equal(false);
  });
});
