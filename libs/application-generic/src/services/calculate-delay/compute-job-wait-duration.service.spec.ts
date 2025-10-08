import { DelayTypeEnum, DigestUnitEnum } from '@novu/shared';
import { addSeconds } from 'date-fns';
import { ComputeJobWaitDurationService } from './compute-job-wait-duration.service';

describe('Compute Job Wait Duration Service', () => {
  const computeJobWaitDurationService = new ComputeJobWaitDurationService();

  describe('toMilliseconds', () => {
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

  describe('calculateDelay - Dynamic Delay', () => {
    it('should calculate delay from ISO-8601 timestamp in payload', () => {
      const futureTime = addSeconds(new Date(), 10);
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.scheduledTime',
      } as const;
      const payload = {
        scheduledTime: futureTime.toISOString(),
      };

      const delay = computeJobWaitDurationService.calculateDelay({
        stepMetadata,
        payload,
        overrides: {},
      });

      expect(delay).toBeGreaterThan(9000);
      expect(delay).toBeLessThan(11000);
    });

    it('should calculate delay from duration object in payload', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.delayWindow',
      } as const;
      const payload = {
        delayWindow: {
          amount: 5,
          unit: 'minutes',
        },
      };

      const delay = computeJobWaitDurationService.calculateDelay({
        stepMetadata,
        payload,
        overrides: {},
      });

      expect(delay).toEqual(300000);
    });

    it('should throw error when dynamic key is not found in payload', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.missingKey',
      } as const;
      const payload = {
        otherField: 'value',
      };

      expect(() => {
        computeJobWaitDurationService.calculateDelay({
          stepMetadata,
          payload,
          overrides: {},
        });
      }).toThrow('not found in payload');
    });

    it('should throw error when timestamp is in the past', () => {
      const pastTime = addSeconds(new Date(), -10);
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.scheduledTime',
      } as const;
      const payload = {
        scheduledTime: pastTime.toISOString(),
      };

      expect(() => {
        computeJobWaitDurationService.calculateDelay({
          stepMetadata,
          payload,
          overrides: {},
        });
      }).toThrow('must be a future date');
    });

    it('should throw error for invalid timestamp format', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.scheduledTime',
      } as const;
      const payload = {
        scheduledTime: 'invalid-timestamp',
      };

      expect(() => {
        computeJobWaitDurationService.calculateDelay({
          stepMetadata,
          payload,
          overrides: {},
        });
      }).toThrow('not a valid format');
    });

    it('should throw error for invalid duration object', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.delayWindow',
      } as const;
      const payload = {
        delayWindow: {
          amount: 5,
          unit: 'invalid-unit',
        },
      };

      expect(() => {
        computeJobWaitDurationService.calculateDelay({
          stepMetadata,
          payload,
          overrides: {},
        });
      }).toThrow('Invalid time unit');
    });

    it('should throw error for negative amount in duration object', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.delayWindow',
      } as const;
      const payload = {
        delayWindow: {
          amount: -5,
          unit: 'minutes',
        },
      };

      expect(() => {
        computeJobWaitDurationService.calculateDelay({
          stepMetadata,
          payload,
          overrides: {},
        });
      }).toThrow('Invalid amount');
    });

    it('should support nested payload keys', () => {
      const stepMetadata = {
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.config.delaySettings',
      } as const;
      const payload = {
        config: {
          delaySettings: {
            amount: 3,
            unit: 'hours',
          },
        },
      };

      const delay = computeJobWaitDurationService.calculateDelay({
        stepMetadata,
        payload,
        overrides: {},
      });

      expect(delay).toEqual(10800000);
    });
  });
});
