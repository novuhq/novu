import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { colors } from '../../../../design-system';
import * as capitalize from 'lodash.capitalize';

const getOrdinal = (num: string | number) => {
  if (typeof num === 'string') {
    const res = parseInt(num, 10);

    if (isNaN(res)) {
      return num;
    }
    num = res;
  }
  const ord = ['st', 'nd', 'rd'];
  const exceptions = [11, 12, 13];
  let nth = ord[(num % 10) - 1];

  if (ord[(num % 10) - 1] == undefined || exceptions.includes(num % 100)) {
    nth = 'th';
  }

  return num + nth;
};

const Highlight = ({ children }) => (
  <b
    style={{
      color: colors.B80,
    }}
  >
    {children}
  </b>
);

export const SentHeader = ({ index }) => {
  const { watch } = useFormContext();

  const type = watch(`steps.${index}.metadata.type`);
  const unit = watch(`steps.${index}.metadata.unit`);
  const backoff = watch(`steps.${index}.metadata.backoff`);
  const at = watch(`steps.${index}.metadata.timed.at`);
  const daysOfWeek = watch(`steps.${index}.metadata.timed.dayOfWeek`) || [];
  const day = watch(`steps.${index}.metadata.timed.day`) || [];
  const every = watch(`steps.${index}.metadata.timed.every`);
  const amount = watch(`steps.${index}.metadata.amount`);
  const BackoffText = useCallback(() => {
    return backoff ? (
      <>
        only if <Highlight>frequent events</Highlight> occur
      </>
    ) : null;
  }, [backoff]);

  if (type === DigestTypeEnum.TIMED && unit == DigestUnitEnum.HOURS) {
    return (
      <>
        Every <Highlight>{every === '1' ? 'hour' : `${every} hours`}</Highlight> <BackoffText />
      </>
    );
  }

  if (type === DigestTypeEnum.TIMED && unit == DigestUnitEnum.MINUTES) {
    return (
      <>
        Every <Highlight>{every === '1' ? 'minute' : `${every} minutes`}</Highlight> <BackoffText />
      </>
    );
  }

  if (type === DigestTypeEnum.TIMED && unit === DigestUnitEnum.DAYS) {
    return (
      <>
        <Highlight>Daily</Highlight> at <Highlight>{at}</Highlight> <BackoffText />
      </>
    );
  }
  if (unit === DigestUnitEnum.WEEKS) {
    return (
      <>
        <Highlight>Weekly</Highlight> on <Highlight>{daysOfWeek?.map((item) => capitalize(item)).join(', ')}</Highlight>{' '}
        at <Highlight>{at}</Highlight>{' '}
        <div>
          <BackoffText />
        </div>
      </>
    );
  }

  if (unit === DigestUnitEnum.MONTHS) {
    return (
      <>
        <Highlight>Monthly</Highlight> on <Highlight>{day?.map((item) => getOrdinal(item)).join(', ')}</Highlight> at{' '}
        <Highlight>{at}</Highlight>
        <div>
          <BackoffText />
        </div>
      </>
    );
  }

  return (
    <>
      after{' '}
      <Highlight>
        {amount} {unit}
      </Highlight>{' '}
      after collecting first event
    </>
  );
};
