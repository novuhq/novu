import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  contactHandleUpdate,
  describeContactHandle,
  readContactHandle,
  slackDisplayNameOf,
  slackDisplayNameOfUser,
  slackWorkspaceDomainOfAction,
  slackWorkspaceDomainOfUrl,
  telegramHandleOf,
} from './contact-handle';

describe('contact handles', () => {
  describe('telegramHandleOf', () => {
    it('takes the username without its @, and first and last name together', () => {
      expect(telegramHandleOf({ id: 42, username: 'dima', first_name: 'Dima', last_name: 'Grossman' })).to.deep.equal({
        username: 'dima',
        displayName: 'Dima Grossman',
      });
      expect(telegramHandleOf({ id: 42, username: '@dima', first_name: 'Dima' })).to.deep.equal({
        username: 'dima',
        displayName: 'Dima',
      });
    });

    it('keeps only the name for someone with no username', () => {
      expect(telegramHandleOf({ id: 42, first_name: 'Dima', last_name: '  ' })).to.deep.equal({ displayName: 'Dima' });
    });

    it('reads nothing without a user', () => {
      expect(telegramHandleOf(undefined)).to.equal(undefined);
      expect(telegramHandleOf({ username: 'dima' })).to.equal(undefined);
    });
  });

  describe('slackDisplayNameOf', () => {
    it("takes the author's display name", () => {
      expect(slackDisplayNameOf({ userId: 'U1', userName: 'dima', fullName: 'Dima Grossman' })).to.equal('dima');
    });

    it('takes the real name when the display name is the bare user id', () => {
      expect(slackDisplayNameOf({ userId: 'U1', userName: 'U1', fullName: 'Dima Grossman' })).to.equal('Dima Grossman');
    });

    it('reads nothing when Slack could not say who it was', () => {
      expect(slackDisplayNameOf({ userId: 'U1', userName: 'U1', fullName: 'U1' })).to.equal(undefined);
      expect(slackDisplayNameOf({ userId: 'U1', userName: 'unknown', fullName: 'unknown' })).to.equal(undefined);
      expect(slackDisplayNameOf(undefined)).to.equal(undefined);
    });
  });

  describe('slackDisplayNameOfUser', () => {
    it('takes the display name, else the real name', () => {
      expect(
        slackDisplayNameOfUser({ real_name: 'Dima G', profile: { display_name: 'dima', real_name: 'Dima G' } })
      ).to.equal('dima');
      expect(
        slackDisplayNameOfUser({ real_name: 'Dima G', profile: { display_name: '', real_name: 'Dima G' } })
      ).to.equal('Dima G');
      expect(slackDisplayNameOfUser({ real_name: 'Dima G' })).to.equal('Dima G');
      expect(slackDisplayNameOfUser(undefined)).to.equal(undefined);
    });
  });

  describe('Slack workspace domain', () => {
    it("comes from a button press's team", () => {
      expect(slackWorkspaceDomainOfAction({ team: { id: 'T1', domain: 'Acme' } })).to.equal('acme.slack.com');
      expect(slackWorkspaceDomainOfAction({ team: { id: 'T1' } })).to.equal(undefined);
      expect(slackWorkspaceDomainOfAction({ team: { domain: 'not a domain' } })).to.equal(undefined);
      expect(slackWorkspaceDomainOfAction(undefined)).to.equal(undefined);
    });

    it("comes from auth.test's workspace address", () => {
      expect(slackWorkspaceDomainOfUrl('https://acme.slack.com/')).to.equal('acme.slack.com');
      expect(slackWorkspaceDomainOfUrl('not a url')).to.equal(undefined);
      expect(slackWorkspaceDomainOfUrl(undefined)).to.equal(undefined);
    });
  });

  describe('readContactHandle', () => {
    it('reads the handle next to the chat id and skips anything else', () => {
      expect(readContactHandle({ chatId: '42', username: 'dima', displayName: '', workspaceDomain: 7 })).to.deep.equal({
        username: 'dima',
      });
      expect(readContactHandle({ chatId: '42' })).to.deep.equal({});
      expect(readContactHandle(undefined)).to.deep.equal({});
    });
  });

  describe('contactHandleUpdate', () => {
    it('sets what changed and unsets what is gone, inside the endpoint data only', () => {
      expect(
        contactHandleUpdate({ username: 'dima', displayName: 'Dima' }, { displayName: 'Dima Grossman' })
      ).to.deep.equal({
        $set: { 'endpoint.displayName': 'Dima Grossman' },
        $unset: { 'endpoint.username': '' },
      });
    });

    it('writes nothing when the handle is the same', () => {
      expect(contactHandleUpdate({ username: 'dima' }, { username: 'dima' })).to.equal(null);
      expect(contactHandleUpdate({}, {})).to.equal(null);
    });
  });

  describe('describeContactHandle', () => {
    it('shows @username on Telegram, else the name, else nothing', () => {
      expect(
        describeContactHandle(HumanChannelViaEnum.TELEGRAM, { username: 'dima', displayName: 'Dima' })
      ).to.deep.equal({
        handle: '@dima',
      });
      expect(describeContactHandle(HumanChannelViaEnum.TELEGRAM, { displayName: 'Dima Grossman' })).to.deep.equal({
        handle: 'Dima Grossman',
      });
      expect(describeContactHandle(HumanChannelViaEnum.TELEGRAM, {})).to.deep.equal({});
      expect(describeContactHandle(HumanChannelViaEnum.TELEGRAM, undefined)).to.deep.equal({});
    });

    it('shows the name and the workspace on Slack, each once known', () => {
      expect(
        describeContactHandle(HumanChannelViaEnum.SLACK, { displayName: 'dima', workspaceDomain: 'acme.slack.com' })
      ).to.deep.equal({ handle: 'dima', workspace: 'acme.slack.com' });
      expect(describeContactHandle(HumanChannelViaEnum.SLACK, { workspaceDomain: 'acme.slack.com' })).to.deep.equal({
        workspace: 'acme.slack.com',
      });
    });

    it('shows nothing for email', () => {
      expect(describeContactHandle(HumanChannelViaEnum.EMAIL, { displayName: 'Dima' })).to.deep.equal({});
    });
  });
});
