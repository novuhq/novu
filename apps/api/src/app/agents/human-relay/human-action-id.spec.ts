import { expect } from 'chai';
import {
  buildHumanApproveActionId,
  buildHumanDenyActionId,
  buildHumanDisambiguationActionId,
  buildHumanOptionActionId,
  parseHumanActionId,
} from './human-action-id';

describe('human action id grammar', () => {
  it('round-trips approve and deny', () => {
    expect(parseHumanActionId(buildHumanApproveActionId('hi_abc123'))).to.deep.equal({
      type: 'approve',
      identifier: 'hi_abc123',
    });
    expect(parseHumanActionId(buildHumanDenyActionId('hi_abc123'))).to.deep.equal({
      type: 'deny',
      identifier: 'hi_abc123',
    });
  });

  it('round-trips choose options (option ids may contain separators)', () => {
    expect(parseHumanActionId(buildHumanOptionActionId('hi_abc123', 'opt_2'))).to.deep.equal({
      type: 'option',
      identifier: 'hi_abc123',
      optionId: 'opt_2',
    });
    expect(parseHumanActionId('human:hi_x:opt:a:b')).to.deep.equal({
      type: 'option',
      identifier: 'hi_x',
      optionId: 'a:b',
    });
  });

  it('round-trips disambiguation picks', () => {
    expect(parseHumanActionId(buildHumanDisambiguationActionId('hi_abc123'))).to.deep.equal({
      type: 'disambiguation-pick',
      identifier: 'hi_abc123',
    });
  });

  it('ignores foreign and malformed ids', () => {
    expect(parseHumanActionId(undefined)).to.equal(null);
    expect(parseHumanActionId('tool-approval:x:approve')).to.equal(null);
    expect(parseHumanActionId('human:')).to.equal(null);
    expect(parseHumanActionId('human:hi_x')).to.equal(null);
    expect(parseHumanActionId('human:hi_x:unknown')).to.equal(null);
    expect(parseHumanActionId('human:hi_x:opt:')).to.equal(null);
    expect(parseHumanActionId('human:pick:')).to.equal(null);
  });
});
