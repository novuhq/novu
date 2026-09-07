import { expect } from 'chai';

import { InboundMailService } from './inbound-mail.service';

let inboundMailService: InboundMailService;

describe('Inbound Mail Service', () => {
  before(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    inboundMailService = new InboundMailService();
    await inboundMailService.inboundParseQueueService.queue.obliterate();
  });

  after(async () => {
    await inboundMailService.inboundParseQueueService.gracefulShutdown();
  });

  it('should wire up the InboundParseQueueService', () => {
    expect(inboundMailService).to.be.ok;
    expect(inboundMailService.inboundParseQueueService).to.be.ok;
    expect(inboundMailService.inboundParseQueueService.topic).to.equal('inbound-parse-mail');
    expect(inboundMailService.inboundParseQueueService.DEFAULT_ATTEMPTS).to.equal(3);
  });
});
