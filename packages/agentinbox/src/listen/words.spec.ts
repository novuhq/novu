import { describe, expect, it } from 'vitest';
import type { ListenMessage } from '../api/listen';
import { hostNameOf } from './hosts';
import {
  allowCard,
  hostInstructions,
  messageForHost,
  movedMessage,
  permissionCard,
  questionCard,
  spanWords,
} from './words';

const MESSAGE: ListenMessage = {
  id: 'msg_1',
  conversationId: 'conv_1',
  channel: 'telegram',
  from: { id: 'ben', name: 'Ben', isOperator: false },
  text: 'Is the deploy done?',
  at: '2026-10-24T10:00:00.000Z',
  round: 0,
  isDirectMessage: true,
};

describe('messageForHost', () => {
  it('says where a message came from and who wrote it', () => {
    expect(messageForHost(MESSAGE)).toBe(
      'New message in conv_1 (telegram) from Ben, a contact, at 2026-10-24T10:00:00.000Z:\n\nIs the deploy done?'
    );
    expect(messageForHost({ ...MESSAGE, from: { id: 'ada', name: 'Ada', isOperator: true } })).toContain(
      'from your operator, Ada,'
    );
  });

  it('marks a group, files that came with it, and answers to the agent’s questions', () => {
    const text = messageForHost({
      ...MESSAGE,
      isDirectMessage: false,
      attachments: [{ name: 'report.pdf' }, { type: 'image' }],
    });
    expect(text).toContain('conv_1 (telegram, a group)');
    expect(text).toContain('(With 2 files: report.pdf, image. See npx @agentinbox/cli show conv_1.)');

    expect(
      messageForHost({ ...MESSAGE, answersMessageId: 'int_9', answer: { status: 'answered', optionId: 'b' } })
    ).toContain('Ben, a contact answered your question int_9 (picked b):');
  });

  it('keeps terminal controls out', () => {
    expect(messageForHost({ ...MESSAGE, text: 'hi\u001b[2J there' })).toContain('hi there');
  });
});

describe('hostInstructions', () => {
  it('tells the host it started which conversation is its own and how to answer in it', () => {
    const text = hostInstructions({
      conversationId: 'conv_1',
      channel: 'telegram',
      project: '~/app',
      alongside: false,
    });

    expect(text).toContain('started you in ~/app');
    expect(text).toContain('`npx @agentinbox/cli reply conv_1 "…"`');
    expect(text).toContain('run without asking anyone');
    expect(text).toContain('add `--to <contact>` to that reply');
    expect(text).toContain('`npx @agentinbox/cli resolve conv_1`');
    expect(text).toContain('only your operator allows things');
    expect(text).not.toContain('Other sessions');
  });

  it('tells it other sessions may work in the same folder when runs go on side by side', () => {
    const text = hostInstructions({ conversationId: 'conv_1', channel: 'telegram', project: '~/app', alongside: true });

    expect(text).toContain('Other sessions may work in this folder at the same time');
    expect(text).toContain('Leave the changes you didn’t make alone.');
  });
});

describe('questionCard', () => {
  it('picks a choose for one pick among a few, and an ask otherwise', () => {
    expect(questionCard({ text: 'Which env?', options: ['Staging', 'Production'], multiple: false })).toEqual({
      kind: 'choose',
      title: 'Which env?',
      options: ['Staging', 'Production'],
    });
    expect(questionCard({ text: 'Which ones?', options: ['A', 'B'], multiple: true })).toEqual({
      kind: 'ask',
      title: 'Which ones?',
      body: 'Pick any of: A; B.',
    });
    expect(questionCard({ text: 'What name?', options: [], multiple: false })).toEqual({
      kind: 'ask',
      title: 'What name?',
    });
  });
});

describe('permissionCard', () => {
  const card = (action: string) =>
    permissionCard({
      hostName: 'Claude Code',
      action,
      brief: 'run a command',
      detail: 'Send the reply.',
      project: '~/app',
      computerName: 'MacBook',
      startedBy: 'you',
      timeoutSeconds: 600,
    });

  it('says in the title what the host wants to do', () => {
    expect(card('run `npm publish`')).toEqual({
      title: 'Claude Code wants to run `npm publish`',
      body: 'Send the reply. In ~/app on MacBook, for your message. Its settings for this project don’t allow this. No answer in 10 minutes counts as Deny.',
    });
  });

  it('gives no card for a command too long to show whole, rather than cut its end off', () => {
    const command = `echo ${'x'.repeat(3000)} && rm -rf ~`;

    expect(card(`run \`${command}\``)).toBeUndefined();
  });

  it('keeps a command over several lines out of the title, and whole in the body', () => {
    const command = 'echo ready\nnpm publish';

    expect(card(`run \`${command}\``)?.title).toBe('Claude Code wants to run a command');
    expect(card(`run \`${command}\``)?.body).toContain(`Run \`${command}\`.`);
  });

  it('keeps a command too long for a card title whole in the body, where it isn’t cut', () => {
    const command = `npx @agentinbox/cli reply conv_1 "${'The folder is empty. '.repeat(6).trim()}"`;

    expect(card(`run \`${command}\``)).toEqual({
      title: 'Claude Code wants to run a command',
      body: `Run \`${command}\`.\n\nSend the reply. In ~/app on MacBook, for your message. Its settings for this project don’t allow this. No answer in 10 minutes counts as Deny.`,
    });
  });

  describe('for a contact’s run', () => {
    const forBen = (action: string, text: string) =>
      permissionCard({
        hostName: 'Claude Code',
        action,
        brief: 'run a command',
        project: '~/app',
        computerName: 'MacBook',
        startedBy: { name: 'Ben', channel: 'telegram', text },
        timeoutSeconds: 600,
      });

    it('says first whose run it is, where they wrote, and what they asked', () => {
      expect(forBen('run `npm publish`', 'Publish the new version')).toEqual({
        title: 'Claude Code wants to run `npm publish`',
        body: 'For Ben’s message on Telegram: “Publish the new version”\n\nIn ~/app on MacBook. Its settings for this project don’t allow this. No answer in 10 minutes counts as Deny.',
      });
    });

    it('shows how a long message began, on one line', () => {
      const text = `Deploy the staging branch\n\nthen ${'check every page '.repeat(10)}`;
      const first = forBen('run `npm publish`', text)?.body.split('\n\n')[0];

      expect(first).toMatch(/^For Ben’s message on Telegram: “Deploy the staging branch then check every page .*…”$/);
      expect(first?.length).toBeLessThan(150);
    });

    it('names the contact before a command too long for the title, and the channel as it is when unknown', () => {
      const command = 'echo ready\nnpm publish';
      const card = permissionCard({
        hostName: 'Claude Code',
        action: `run \`${command}\``,
        brief: 'run a command',
        project: '~/app',
        computerName: 'MacBook',
        startedBy: { name: 'Ben', channel: 'email', text: 'Ship it' },
        timeoutSeconds: 600,
      });

      expect(card?.body).toMatch(
        /^For Ben’s message on email: “Ship it”\n\nRun `echo ready\nnpm publish`\.\n\nIn ~\/app/
      );
    });

    it('says only whose message it was when it had no words, or when the action leaves no room for them', () => {
      expect(forBen('run `ls`', '  ')?.body).toMatch(/^For Ben’s message on Telegram\.\n\nIn /);

      const long = `run \`echo ${'x'.repeat(2840)}\``;
      expect(forBen(long, 'Print a lot of x')?.body).toMatch(/^For Ben’s message on Telegram\.\n\n/);
    });
  });
});

describe('allowCard', () => {
  it('asks in the words the contract gives', () => {
    expect(
      allowCard({
        hostName: 'Claude Code',
        computerName: 'MacBook',
        project: '~/projects/app',
        hostNames: hostNameOf,
      }).title
    ).toBe('Listen for messages on MacBook, and start Claude Code in ~/projects/app?');
  });

  it('says it moves the agent from another computer, or replaces another host here', () => {
    const listening = {
      computerId: 'cmp_desktop_000000001',
      computerName: 'Desktop',
      host: 'codex' as const,
      project: '~/work',
      since: '',
      renewedAt: '',
      expiresAt: '',
    };
    const base = { hostName: 'Claude Code', computerName: 'MacBook', project: '~/app', hostNames: hostNameOf };

    expect(allowCard({ ...base, elsewhere: listening, computerId: 'cmp_macbook_0000000001' }).body).toContain(
      'It is listening on Desktop now (Codex, in ~/work); this moves it here.'
    );
    expect(allowCard({ ...base, elsewhere: listening, computerId: listening.computerId }).body).toContain(
      'It is listening on this computer now for Codex, in ~/work; this replaces that.'
    );
  });
});

describe('movedMessage and spanWords', () => {
  it('say what happened in plain words', () => {
    expect(movedMessage(null, hostNameOf)).toBe(
      'It is listening on another computer now, so this computer stopped. Run `npx @agentinbox/cli listen <host>` here to take it back.'
    );
    expect(spanWords(600)).toBe('10 minutes');
    expect(spanWords(60)).toBe('1 minute');
    expect(spanWords(7200)).toBe('2 hours');
    expect(spanWords(1.5)).toBe('2 seconds');
  });
});
