import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { getChatAttachments, isChatAttachment, isEmailAttachment } from './attachment-channels';

describe('attachment channels', () => {
  const file = Buffer.from('a,b\n1,2\n');

  describe('isEmailAttachment', () => {
    it('keeps attachments that do not name their channels, as email always has', () => {
      expect(isEmailAttachment({ file })).to.equal(true);
      expect(isEmailAttachment({ file, channels: [] })).to.equal(true);
    });

    it('keeps attachments that list email', () => {
      expect(isEmailAttachment({ file, channels: [ChannelTypeEnum.EMAIL, ChannelTypeEnum.CHAT] })).to.equal(true);
    });

    it('drops attachments marked for other channels only', () => {
      expect(isEmailAttachment({ file, channels: [ChannelTypeEnum.CHAT] })).to.equal(false);
    });
  });

  describe('isChatAttachment', () => {
    it('only sends attachments that list chat', () => {
      expect(isChatAttachment({ file, channels: [ChannelTypeEnum.CHAT] })).to.equal(true);
      expect(isChatAttachment({ file, channels: [ChannelTypeEnum.EMAIL, ChannelTypeEnum.CHAT] })).to.equal(true);
    });

    it('never sends attachments without channels, so email files stay out of shared chats', () => {
      expect(isChatAttachment({ file })).to.equal(false);
      expect(isChatAttachment({ file, channels: [] })).to.equal(false);
      expect(isChatAttachment({ file, channels: [ChannelTypeEnum.EMAIL] })).to.equal(false);
      expect(isChatAttachment({ file, channels: 'chat' })).to.equal(false);
    });
  });

  describe('getChatAttachments', () => {
    it('returns the chat files with their bytes and reports the ones storage could not load', () => {
      const result = getChatAttachments({
        attachments: [
          { file, name: 'rows.csv', mime: 'text/csv', channels: [ChannelTypeEnum.CHAT] },
          { file, name: 'invoice.pdf', mime: 'application/pdf' },
          { file: null, name: 'gone.pdf', mime: 'application/pdf', channels: [ChannelTypeEnum.CHAT] },
          { file, channels: [ChannelTypeEnum.CHAT] },
        ],
      });

      expect(result.files).to.deep.equal([
        { name: 'rows.csv', mime: 'text/csv', file },
        { name: 'attachment-4', mime: 'application/octet-stream', file },
      ]);
      expect(result.unavailable).to.deep.equal([
        { name: 'gone.pdf', status: 'failed', reason: "The file couldn't be loaded from Novu's storage." },
      ]);
    });

    it('returns nothing when the payload has no attachments', () => {
      expect(getChatAttachments({})).to.deep.equal({ files: [], unavailable: [] });
      expect(getChatAttachments(undefined)).to.deep.equal({ files: [], unavailable: [] });
      expect(getChatAttachments({ attachments: 'not-a-list' })).to.deep.equal({ files: [], unavailable: [] });
    });
  });
});
