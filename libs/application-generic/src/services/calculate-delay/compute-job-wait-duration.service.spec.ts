import { DigestUnitEnum } from '@novu/shared';
import { ComputeJobWaitDurationService } from './compute-job-wait-duration.service';

describe('Compute Job Wait Duration Service', () => {
  describe('toMilliseconds', () => {
    const computeJobWaitDurationService = new ComputeJobWaitDurationService();

    it('should convert seconds to milliseconds', () => {
      const result = (computeJobWaitDurationService as any).toMilliseconds(5, DigestUnitEnum.SECONDS);
      expect(result).toEqual(5000);
    });

    it('should convert minutes to milliseconds', () => {
      const result = (computeJobWaitDurationService as any).toMilliseconds(5, DigestUnitEnum.MINUTES);
      expect(result).toEqual(300000);
    });

    it('should convert hours to milliseconds', () => {
      const result = (computeJobWaitDurationService as any).toMilliseconds(5, DigestUnitEnum.HOURS);
      expect(result).toEqual(18000000);
    });

    it('should convert days to milliseconds', () => {
      const result = (computeJobWaitDurationService as any).toMilliseconds(1, DigestUnitEnum.DAYS);
      expect(result).toEqual(86400000);
    });
  });
});
