import { expect } from 'chai';
import { DigestUnitEnum } from '@novu/shared';
import { WorkflowQueueService } from './workflow.queue.service';

describe('Workflow queue service', function () {
  describe('toMilliseconds', function () {
    it('should convert seconds to milliseconds', function () {
      const result = WorkflowQueueService.toMilliseconds(5, DigestUnitEnum.SECONDS);
      expect(result).to.equal(5000);
    });

    it('should convert minutes to milliseconds', function () {
      const result = WorkflowQueueService.toMilliseconds(5, DigestUnitEnum.MINUTES);
      expect(result).to.equal(300000);
    });

    it('should convert hours to milliseconds', function () {
      const result = WorkflowQueueService.toMilliseconds(5, DigestUnitEnum.HOURS);
      expect(result).to.equal(18000000);
    });

    it('should convert days to milliseconds', function () {
      const result = WorkflowQueueService.toMilliseconds(1, DigestUnitEnum.DAYS);
      expect(result).to.equal(86400000);
    });
  });
});
