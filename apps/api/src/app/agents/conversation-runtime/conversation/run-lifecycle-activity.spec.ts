import { ConversationActivityTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import {
  describeRunLifecycleFromEvent,
  resolveLifecycleChannel,
  runIdFromLifecycleIdentifier,
  runLifecycleIdentifier,
} from './run-lifecycle-activity';

describe('run-lifecycle-activity', () => {
  it('prefers web_chat channel when resolving lifecycle channel', () => {
    const channel = resolveLifecycleChannel({
      _id: 'conv-1',
      channels: [
        { platform: 'slack', _integrationId: 'slack-int', platformThreadId: 't-slack' },
        { platform: 'web_chat', _integrationId: 'web-int', platformThreadId: 't-web' },
      ],
    } as never);

    expect(channel.platform).to.equal('web_chat');
    expect(channel._integrationId).to.equal('web-int');
  });

  it('builds stable lifecycle identifiers', () => {
    expect(runLifecycleIdentifier('run-42', 'start')).to.equal('run_run-42_start');
    expect(runIdFromLifecycleIdentifier('run_run-42_start')).to.equal('run-42');
  });

  it('describes run-finish from protocol event', () => {
    const described = describeRunLifecycleFromEvent({
      type: 'run-finish',
      outcome: 'completed',
      finishReason: 'stop',
    });

    expect(described.type).to.equal(ConversationActivityTypeEnum.RUN_FINISH);
    expect(described.richContent).to.deep.equal({
      lifecycle: { outcome: 'completed', finishReason: 'stop' },
    });
  });
});
