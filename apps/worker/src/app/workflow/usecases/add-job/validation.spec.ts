import { BadRequestException } from '@nestjs/common';
import { JobEntity } from '@novu/dal';
import { DigestTypeEnum, DigestUnitEnum, MonthlyTypeEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { validateDigest } from './validation';

function createMonthlyDigestJob(monthDays: number[]): JobEntity {
  return {
    type: StepTypeEnum.DIGEST,
    digest: {
      type: DigestTypeEnum.TIMED,
      amount: 1,
      unit: DigestUnitEnum.MONTHS,
      timed: {
        atTime: '09:00',
        monthlyType: MonthlyTypeEnum.EACH,
        monthDays,
      },
    },
  } as JobEntity;
}

describe('validateDigest', () => {
  describe('monthDays validation', () => {
    it('should accept valid month days between 1 and 31', () => {
      expect(() => validateDigest(createMonthlyDigestJob([1]))).to.not.throw();
      expect(() => validateDigest(createMonthlyDigestJob([15]))).to.not.throw();
      expect(() => validateDigest(createMonthlyDigestJob([1, 28, 31]))).to.not.throw();
    });

    it('should reject out-of-range month days', () => {
      expect(() => validateDigest(createMonthlyDigestJob([0])))
        .to.throw(BadRequestException)
        .with.property('message', 'Digest timed config monthDays values are invalid');

      expect(() => validateDigest(createMonthlyDigestJob([32])))
        .to.throw(BadRequestException)
        .with.property('message', 'Digest timed config monthDays values are invalid');

      expect(() => validateDigest(createMonthlyDigestJob([40, 99])))
        .to.throw(BadRequestException)
        .with.property('message', 'Digest timed config monthDays values are invalid');
    });
  });
});
