import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from './bridge-executor.service';

describe('BridgeExecutorService', () => {
  describe('mapRichContentForBridge', () => {
    it('should omit an attachment when signing fails without throwing', async () => {
      const logger = {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        setContext: sinon.stub(),
      };
      const attachmentStorage = {
        signRead: sinon.stub().rejects(new Error('storage unavailable')),
      };
      const service = new BridgeExecutorService({} as any, logger as any, attachmentStorage as any);

      const result = await (service as any).mapRichContentForBridge(
        {
          attachments: [
            {
              type: 'image',
              storageKey: 'org/env/agents/conv/message/0-image.png',
              name: 'image.png',
              mimeType: 'image/png',
              size: 123,
            },
          ],
        },
        'activity-id'
      );

      expect(result).to.deep.equal({ attachments: [] });
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });
});
