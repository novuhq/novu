import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ListenMessage } from '../api/listen';
import { commandReachesKey, keyGuardFor, reachesKey, runLevel } from './contact-guard';

const ADA: ListenMessage = {
  id: 'msg_1',
  conversationId: 'conv_1',
  channel: 'telegram',
  from: { id: 'ada', name: 'Ada', isOperator: true },
  text: 'Deploy it',
  at: '2026-11-09T10:00:00.000Z',
  round: 0,
  isDirectMessage: true,
};
const BEN: ListenMessage = { ...ADA, id: 'msg_2', from: { id: 'ben', name: 'Ben', isOperator: false } };

const CAROL: ListenMessage = {
  ...ADA,
  id: 'msg_3',
  from: { id: 'carol', name: 'Carol', isOperator: false, fullAccess: true },
};

describe('runLevel', () => {
  it('takes the operator’s own direct chat as theirs, and anything with a contact or in a group as a contact’s', () => {
    expect(runLevel([ADA])).toBe('operator');
    expect(runLevel([BEN])).toBe('contact');
    expect(runLevel([ADA, BEN])).toBe('contact');
    expect(runLevel([{ ...ADA, isDirectMessage: false }])).toBe('contact');
  });

  it('gives full access to a contact who has it, in their direct chat, as the switch is now', () => {
    expect(runLevel([CAROL])).toBe('fullAccess');
    expect(runLevel([CAROL, { ...CAROL, id: 'msg_4' }])).toBe('fullAccess');
    // Their session ran as a contact's before they got it: it goes on with full access now.
    expect(runLevel([CAROL], 'contact')).toBe('fullAccess');
    // Turned off since: a contact's run again.
    expect(runLevel([{ ...CAROL, from: { ...CAROL.from, fullAccess: false } }], 'fullAccess')).toBe('contact');
    // Never in a group, never mixed with someone else's message, and never as the operator.
    expect(runLevel([{ ...CAROL, isDirectMessage: false }])).toBe('contact');
    expect(runLevel([CAROL, BEN])).toBe('contact');
    expect(runLevel([{ ...ADA, from: { ...ADA.from, fullAccess: true } }])).toBe('operator');
  });

  it('lets answers alone go on as their session was, and as a contact’s when that isn’t known', () => {
    const answer = { ...BEN, answersMessageId: 'int_1' };

    expect(runLevel([answer], 'operator')).toBe('operator');
    expect(runLevel([answer], 'contact')).toBe('contact');
    expect(runLevel([answer])).toBe('contact');
    // An answer doesn't make the operator's own run a contact's.
    expect(runLevel([ADA, answer], 'operator')).toBe('operator');
    // A contact's session stays one.
    expect(runLevel([ADA], 'contact')).toBe('contact');
  });

  it('keeps a full-access session’s answers at full access only while they still come with it', () => {
    const answer = { ...CAROL, answersMessageId: 'int_1' };
    const without = { ...answer, from: { ...answer.from, fullAccess: false } };

    expect(runLevel([answer], 'fullAccess')).toBe('fullAccess');
    expect(runLevel([without], 'fullAccess')).toBe('contact');
    expect(runLevel([{ ...BEN, answersMessageId: 'int_2' }], 'fullAccess')).toBe('contact');
    // With her messages too: an answer that came after the switch went off takes full access away.
    expect(runLevel([CAROL, answer], 'fullAccess')).toBe('fullAccess');
    expect(runLevel([CAROL, without], 'fullAccess')).toBe('contact');
  });
});

describe('the key guard', () => {
  let root: string;
  let home: string;
  let project: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'contact-guard-')));
    home = join(root, 'home');
    project = join(home, 'work', 'app');
    mkdirSync(join(home, '.agentinbox'), { recursive: true });
    writeFileSync(join(home, '.agentinbox', 'config.json'), '{}');
    mkdirSync(join(project, 'docs'), { recursive: true });
    writeFileSync(join(project, 'README.md'), '');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds the key where the CLI keeps it, and in the file INBOX_CONFIG points at', () => {
    const guard = keyGuardFor(project, home, join(project, 'inbox.json'));

    expect(guard.places).toEqual([join(home, '.agentinbox'), join(project, 'inbox.json')]);
    expect(reachesKey(join(home, '.agentinbox', 'config.json'), guard)).toBe(true);
    expect(reachesKey(join(project, 'inbox.json'), guard)).toBe(true);
    expect(reachesKey(join(project, 'README.md'), guard)).toBe(false);
    // A search reaches it from a folder that holds it.
    expect(reachesKey(home, guard)).toBe(false);
    expect(reachesKey(home, guard, true)).toBe(true);
    expect(reachesKey(project, guard, true)).toBe(true);
    expect(reachesKey(join(project, 'docs'), guard, true)).toBe(false);
  });

  it('reads a command’s words, and follows the links of the paths it names', () => {
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    const guard = keyGuardFor(project, home);
    const reaches = (command: string, cwd = project) => commandReachesKey(command, cwd, guard);

    expect(reaches('cat README.md')).toBe(false);
    expect(reaches('npm test')).toBe(false);
    for (const command of [
      'cat ~/.agentinbox/config.json',
      `cat ${join(home, '.agentinbox', 'config.json')}`,
      "cat ~/.agent''inbox/config.json",
      'cat ~/.agent*/config.json',
      'cat $HOME/.a?entinbox/config.json',
      'env INBOX_CONFIG=x printenv',
      'cat docs/inbox/config.json',
      'head -n 5 docs/inbox/config.json && echo done',
      'cp --target-directory=docs/inbox x',
      'grep -r secretKey ~',
      'grep -r secretKey ../..',
    ]) {
      expect(reaches(command), command).toBe(true);
    }
    // From where it runs.
    expect(reaches('cat inbox/config.json', join(project, 'docs'))).toBe(true);
    expect(reaches('cat inbox/config.json')).toBe(false);
  });

  it('reads each command of a chain from where the cd before it left the shell', () => {
    symlinkSync(join(home, '.agentinbox'), join(project, 'docs', 'inbox'));
    const guard = keyGuardFor(project, home);
    const reaches = (command: string) => commandReachesKey(command, project, guard);

    for (const command of [
      'cd docs && cat inbox/config.json',
      'cd docs && cd inbox && cat config.json',
      'cd ~/work/app/docs && cat inbox/config.json',
      // A change of folder this can't follow.
      'cd - && cat inbox/config.json',
      'cd -P docs && cat inbox/config.json',
      'pushd docs && cat inbox/config.json',
    ]) {
      expect(reaches(command), command).toBe(true);
    }
    expect(reaches('cd docs && cat ../README.md')).toBe(false);
    expect(reaches('cd .. && cd app && cat inbox/config.json')).toBe(false);
  });

  it('counts the folder’s links git keeps that lead to the key, and anything run in a folder that holds one', () => {
    execFileSync('git', ['init', '-q'], { cwd: project });
    symlinkSync('../../../.agentinbox', join(project, 'docs', 'assets'));
    symlinkSync('../README.md', join(project, 'docs', 'readme'));
    execFileSync('git', ['add', 'docs/assets', 'docs/readme', 'README.md'], { cwd: project });
    const guard = keyGuardFor(project, home);

    expect(guard.links).toEqual([join(project, 'docs', 'assets')]);
    // A command that names no path still searches where it runs (`grep -r`, `rg`).
    expect(commandReachesKey('ls', project, guard)).toBe(true);
    expect(commandReachesKey('grep -r secretKey', join(project, 'docs'), guard)).toBe(true);
    expect(reachesKey(join(project, 'docs'), guard, true)).toBe(true);
    expect(reachesKey(join(project, 'README.md'), guard)).toBe(false);
    // Without git, no links are known.
    expect(keyGuardFor(root, home).links).toEqual([]);
  });
});
