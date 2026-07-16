import { expect } from 'chai';

import { isValidMetadataSignalKey } from './agent-reply-payload.dto';

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
