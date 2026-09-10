import { expect } from 'chai';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { AgentReplyPayloadDto, IsValidReplyContent, isValidMetadataSignalKey } from './agent-reply-payload.dto';

describe('isValidMetadataSignalKey', () => {
  it('accepts plain and namespaced user-facing keys', () => {
    expect(isValidMetadataSignalKey('ticketId')).to.equal(true);
    expect(isValidMetadataSignalKey('crm:ticketId')).to.equal(true);
    expect(isValidMetadataSignalKey('novuCopilotWorkflowId')).to.equal(true);
    expect(isValidMetadataSignalKey('external_id-1')).to.equal(true);
  });

  it('accepts the framework-reserved __novu: namespace keys', () => {
    expect(isValidMetadataSignalKey('__novu:authCardMessageId')).to.equal(true);
    expect(isValidMetadataSignalKey('__novu:authLinkedCard')).to.equal(true);
  });

  it('rejects prototype-pollution gadget keys', () => {
    expect(isValidMetadataSignalKey('__proto__')).to.equal(false);
    expect(isValidMetadataSignalKey('constructor')).to.equal(false);
    expect(isValidMetadataSignalKey('prototype')).to.equal(false);
  });

  it('rejects reserved-namespace keys whose suffix breaks storage/serialization', () => {
    expect(isValidMetadataSignalKey('__novu:a.b')).to.equal(false);
    expect(isValidMetadataSignalKey('__novu:a[0]')).to.equal(false);
    expect(isValidMetadataSignalKey('__novu:')).to.equal(false);
  });

  it('rejects leading-underscore keys outside the reserved namespace', () => {
    expect(isValidMetadataSignalKey('__custom:key')).to.equal(false);
    expect(isValidMetadataSignalKey('_leading')).to.equal(false);
  });

  it('rejects non-string, empty, and over-long keys', () => {
    expect(isValidMetadataSignalKey(undefined)).to.equal(false);
    expect(isValidMetadataSignalKey(42)).to.equal(false);
    expect(isValidMetadataSignalKey('')).to.equal(false);
    expect(isValidMetadataSignalKey('a'.repeat(129))).to.equal(false);
  });
});

describe('IsValidReplyContent', () => {
  const validator = new IsValidReplyContent();

  it('rejects non-string markdown without throwing', () => {
    expect(validator.validate({ markdown: 123 } as never)).to.equal(false);
  });

  it('rejects null card without throwing', () => {
    expect(validator.validate({ card: null } as never)).to.equal(false);
  });

  it('rejects empty markdown', () => {
    expect(validator.validate({ markdown: '   ' })).to.equal(false);
  });

  it('accepts a card with type card', () => {
    expect(
      validator.validate({
        card: { type: 'card', children: [{ type: 'text', content: 'hi' }] },
      })
    ).to.equal(true);
  });

  it('rejects a card missing type card', () => {
    expect(validator.validate({ card: { type: 'section', children: [] } as never })).to.equal(false);
  });
});

describe('AgentReplyPayloadDto signals', () => {
  async function validateSignals(signals: unknown) {
    const dto = plainToInstance(AgentReplyPayloadDto, {
      conversationId: '64f5a1c2e8b7a3d9f0c1b2a3',
      integrationIdentifier: 'slack-support',
      signals,
    });

    return validate(dto);
  }

  function constraintNames(errors: ValidationError[]): string[] {
    const names: string[] = [];
    const walk = (list: ValidationError[]) => {
      for (const error of list) {
        if (error.constraints) {
          names.push(...Object.values(error.constraints));
        }
        if (error.children?.length) {
          walk(error.children);
        }
      }
    };

    walk(errors);

    return names;
  }

  it('accepts a mixed human and trigger array, validating each item as its own DTO', async () => {
    const errors = await validateSignals([
      {
        type: 'human',
        kind: 'approve',
        prompt: 'Deploy v2?',
        requestId: 'hr_1',
        to: ['alice', 'bob'],
        card: { title: 'Deploy v2?' },
      },
      { type: 'trigger', workflowId: 'order-shipped', to: [{ type: 'Topic', topicKey: 'ops' }] },
    ]);

    expect(errors).to.have.length(0);
  });

  it('accepts a human signal with markdown card and no prompt', async () => {
    const errors = await validateSignals([
      {
        type: 'human',
        kind: 'approve',
        requestId: 'hr_1',
        card: { markdown: 'Please approve in the thread.' },
      },
    ]);

    expect(errors).to.have.length(0);
  });

  it('accepts a human signal with a posted card element and no prompt', async () => {
    const errors = await validateSignals([
      {
        type: 'human',
        kind: 'approve',
        requestId: 'hr_1',
        actionIdentifier: 'hr_1',
        card: { type: 'card', title: 'Refund $25?', children: [] },
      },
    ]);

    expect(errors).to.have.length(0);
  });

  it('rejects a human signal card that is neither chrome nor a Card element', async () => {
    const errors = await validateSignals([
      {
        type: 'human',
        kind: 'approve',
        requestId: 'hr_1',
        card: { type: 'human-approve-card', title: 'Refund $25?' },
      },
    ]);

    expect(constraintNames(errors).some((message) => message.includes('chrome') || message.includes('Card'))).to.equal(
      true
    );
  });

  it('rejects a human signal whose to uses a workflow topic recipient', async () => {
    const errors = await validateSignals([
      {
        type: 'human',
        kind: 'ask',
        prompt: 'Approve?',
        requestId: 'hr_1',
        card: { title: 'Approve?' },
        to: { type: 'Topic', topicKey: 'ops' },
      },
    ]);

    expect(constraintNames(errors).some((message) => message.includes('subscriberId'))).to.equal(true);
  });

  it('accepts a trigger signal whose to is a workflow topic recipient', async () => {
    const errors = await validateSignals([
      { type: 'trigger', workflowId: 'order-shipped', to: [{ type: 'Topic', topicKey: 'ops' }] },
    ]);

    expect(errors).to.have.length(0);
  });

  it('rejects a choose signal without options', async () => {
    const errors = await validateSignals([
      { type: 'human', kind: 'choose', prompt: 'Which region?', requestId: 'hr_1' },
    ]);

    expect(errors).to.not.have.length(0);
    expect(constraintNames(errors).some((message) => /options|array/i.test(message))).to.equal(true);
  });

  it('rejects a metadata set signal missing value', async () => {
    const errors = await validateSignals([{ type: 'metadata', key: 'ticketId' }]);

    expect(errors).to.not.have.length(0);
    expect(constraintNames(errors).some((message) => /value/i.test(message))).to.equal(true);
  });

  it('rejects an unrecognized signal type', async () => {
    const errors = await validateSignals([{ type: 'unknown', workflowId: 'x' }]);

    expect(errors).to.not.have.length(0);
    expect(constraintNames(errors).some((message) => message.includes('metadata, trigger, or human'))).to.equal(true);
  });
});
