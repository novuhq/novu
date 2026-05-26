import { expect } from 'chai';
import {
  composeManagedAgentSystemPrompt,
  MANAGED_AGENT_REPLY_STYLE_MARKER,
  stripManagedAgentSystemPromptSuffix,
} from './compose-managed-agent-system-prompt';

describe('composeManagedAgentSystemPrompt', () => {
  it('appends messaging reply-style instructions to a base prompt', () => {
    const composed = composeManagedAgentSystemPrompt('You are a support agent.');

    expect(composed.startsWith('You are a support agent.')).to.equal(true);
    expect(composed).to.include(MANAGED_AGENT_REPLY_STYLE_MARKER);
    expect(composed).to.include('Match reply length to the question');
  });

  it('returns only reply-style instructions when the base prompt is empty', () => {
    const composed = composeManagedAgentSystemPrompt('');

    expect(composed).to.not.include('You are');
    expect(composed).to.include('messaging channels');
  });

  it('is idempotent when the suffix is already present', () => {
    const once = composeManagedAgentSystemPrompt('You are a support agent.');
    const twice = composeManagedAgentSystemPrompt(once);

    expect(twice).to.equal(once);
  });
});

describe('stripManagedAgentSystemPromptSuffix', () => {
  it('removes the appended reply-style block', () => {
    const composed = composeManagedAgentSystemPrompt('You are a support agent.');

    expect(stripManagedAgentSystemPromptSuffix(composed)).to.equal('You are a support agent.');
  });

  it('returns the original prompt when no suffix is present', () => {
    expect(stripManagedAgentSystemPromptSuffix('You are a support agent.')).to.equal('You are a support agent.');
  });
});
