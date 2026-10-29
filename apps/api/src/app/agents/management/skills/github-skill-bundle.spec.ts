import { expect } from 'chai';
import { buildRepoSkillDisplayTitle, buildSkillDisplayTitle } from './github-skill-bundle';

describe('github skill display titles', () => {
  it('round-trips a GitHub title whose cut lands on an emoji', () => {
    const title = buildSkillDisplayTitle({
      owner: 'a'.repeat(40),
      repo: 'repo',
      ref: 'HEAD',
      subPath: `${'b'.repeat(21)}\u{1F600}rest`,
    });
    const roundTripped = Buffer.from(title, 'utf8').toString('utf8');

    expect(roundTripped).to.equal(title);
    expect(title.includes('\uFFFD')).to.equal(false);
    expect(title.length).to.be.at.most(64);
    expect(title.endsWith('\u2026')).to.equal(true);
  });

  it('keeps a short skill path as owner and basename', () => {
    expect(
      buildSkillDisplayTitle({
        owner: 'anthropics',
        repo: 'skills',
        ref: 'HEAD',
        subPath: 'document-skills/pdf',
      })
    ).to.equal('anthropics-pdf');
  });

  it('round-trips a repo skill title whose cut lands on an emoji', () => {
    const title = buildRepoSkillDisplayTitle('a'.repeat(40), 'repo', `${'b'.repeat(21)}\u{1F600}rest`);
    const roundTripped = Buffer.from(title, 'utf8').toString('utf8');

    expect(roundTripped).to.equal(title);
    expect(title.includes('\uFFFD')).to.equal(false);
    expect(title.length).to.be.at.most(64);
    expect(title.endsWith('\u2026')).to.equal(true);
  });
});
