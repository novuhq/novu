import { useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { useMantineColorScheme } from '@mantine/core';
import { DigestTypeEnum, DigestUnitEnum, MonthlyTypeEnum } from '@novu/shared';

import { colors } from '../../../../design-system';
import { pluralizeTime } from '../../../../utils';

const getOrdinalValueLabel = (value: string) => {
  if (value === 'day' || value === 'weekday') {
    return value;
  }
  if (value === 'weekend') {
    return 'weekend day';
  }

  return capitalize(value);
};

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

const Highlight = ({ children }) => {
  const { colorScheme } = useMantineColorScheme();

  return (
    <b
      style={{
        color: colorScheme === 'dark' ? colors.B80 : colors.B40,
      }}
    >
      {children}
    </b>
  );
};
export const WillBeSentHeader = ({ index }) => {
  const { watch, setValue } = useFormContext();

  const type = watch(`steps.${index}.metadata.type`);
  const unit = watch(`steps.${index}.metadata.unit`);
  const backoff = watch(`steps.${index}.metadata.backoff`);
  const atTime = watch(`steps.${index}.metadata.timed.atTime`);
  const weekDays = watch(`steps.${index}.metadata.timed.weekDays`) || [];
  const monthDays = watch(`steps.${index}.metadata.timed.monthDays`) || [];
  const amount = watch(`steps.${index}.metadata.amount`);

  useEffect(() => {
    if (!backoff) {
      return;
    }
    if (type !== DigestTypeEnum.TIMED) {
      return;
    }
    setValue(`steps.${index}.metadata.backoff`, false);
  }, [backoff, type, index]);

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
        Every <Highlight>{pluralizeTime(amount, 'hour')}</Highlight> <BackoffText />
      </>
    );
  }

  if (type === DigestTypeEnum.TIMED && unit == DigestUnitEnum.MINUTES) {
    return (
      <>
        Every <Highlight>{pluralizeTime(amount, 'minute')}</Highlight> <BackoffText />
      </>
    );
  }

  if (type === DigestTypeEnum.TIMED && unit === DigestUnitEnum.DAYS) {
    if (!atTime) {
      return (
        <>
          Every <Highlight>{getOrdinal(amount)} </Highlight> day
        </>
      );
    }

    if (amount !== '1') {
      return (
        <>
          Every <Highlight>{getOrdinal(amount)} </Highlight> day at <Highlight>{atTime}</Highlight> <BackoffText />
        </>
      );
    }

    return (
      <>
        <Highlight>Daily</Highlight> at <Highlight>{atTime}</Highlight> <BackoffText />
      </>
    );
  }
  if (type === DigestTypeEnum.TIMED && unit === DigestUnitEnum.WEEKS) {
    return (
      <>
        <Highlight>Weekly</Highlight> on <Highlight>{weekDays?.map((item) => capitalize(item)).join(', ')}</Highlight>{' '}
        at <Highlight>{atTime}</Highlight>{' '}
        <div>
          <BackoffText />
        </div>
      </>
    );
  }

  if (type === DigestTypeEnum.TIMED && unit === DigestUnitEnum.MONTHS) {
    const monthlyType = watch(`steps.${index}.metadata.timed.monthlyType`);

    if (monthlyType === MonthlyTypeEnum.ON) {
      const ordinal = watch(`steps.${index}.metadata.timed.ordinal`);
      const ordinalValue = watch(`steps.${index}.metadata.timed.ordinalValue`);

      if (!ordinal || !ordinalValue) {
        return null;
      }

      return (
        <>
          Every month on the{' '}
          <Highlight>
            {getOrdinal(ordinal)} {getOrdinalValueLabel(ordinalValue)}
          </Highlight>
        </>
      );
    }

    return (
      <>
        <Highlight>Monthly</Highlight> on <Highlight>{monthDays?.map((item) => getOrdinal(item)).join(', ')}</Highlight>{' '}
        at <Highlight>{atTime}</Highlight>
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
