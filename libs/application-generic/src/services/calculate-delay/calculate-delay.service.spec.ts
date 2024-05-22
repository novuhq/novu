import { DigestUnitEnum } from '@novu/shared';
import { CalculateDelayService } from './calculate-delay.service';

describe('Calculate Delay Service', function () {
  describe('toMilliseconds', function () {
    const calculateDelayService = new CalculateDelayService();

    it('should convert seconds to milliseconds', function () {
      const result = (calculateDelayService as any).toMilliseconds(
        5,
        DigestUnitEnum.SECONDS
      );
      expect(result).toEqual(5000);
    });

    it('should convert minutes to milliseconds', function () {
      const result = (calculateDelayService as any).toMilliseconds(
        5,
        DigestUnitEnum.MINUTES
      );
      expect(result).toEqual(300000);
    });

    it('should convert hours to milliseconds', function () {
      const result = (calculateDelayService as any).toMilliseconds(
        5,
        DigestUnitEnum.HOURS
      );
      expect(result).toEqual(18000000);
    });

    it('should convert days to milliseconds', function () {
      const result = (calculateDelayService as any).toMilliseconds(
        1,
        DigestUnitEnum.DAYS
      );
      expect(result).toEqual(86400000);
    });
  });
});
