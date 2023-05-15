import { useFormContext } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { useMantineColorScheme } from '@mantine/core';
import { DigestUnitEnum, MonthlyTypeEnum } from '@novu/shared';

import { colors } from '../../../../design-system';
import { pluralizeTime } from '../../../../utils';

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

export const TimedDigestWillBeSentHeader = ({ index }: { index: number }) => {
  const { watch } = useFormContext();

  const unit = watch(`steps.${index}.digestMetadata.timed.unit`);
  if (unit == DigestUnitEnum.MINUTES) {
    const amount = watch(`steps.${index}.digestMetadata.timed.minutes.amount`);

    return (
      <>
        Every <Highlight>{pluralizeTime(amount, 'minute')}</Highlight>
      </>
    );
  }

  if (unit == DigestUnitEnum.HOURS) {
    const amount = watch(`steps.${index}.digestMetadata.timed.hours.amount`);

    return (
      <>
        Every <Highlight>{pluralizeTime(amount, 'hour')}</Highlight>
      </>
    );
  }

  if (unit === DigestUnitEnum.DAYS) {
    const amount = watch(`steps.${index}.digestMetadata.timed.days.amount`);
    const atTime = watch(`steps.${index}.digestMetadata.timed.days.atTime`);

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight>{getOrdinal(amount)} </Highlight> day
          {atTime && (
            <>
              {' '}
              at <Highlight>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight>Daily</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  if (unit === DigestUnitEnum.WEEKS) {
    const amount = watch(`steps.${index}.digestMetadata.timed.weeks.amount`);
    const atTime = watch(`steps.${index}.digestMetadata.timed.weeks.atTime`);
    const weekDays = watch(`steps.${index}.digestMetadata.timed.weeks.weekDays`) || [];

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight>{getOrdinal(amount)} </Highlight> week on{' '}
          <Highlight>{weekDays?.map((item) => capitalize(item)).join(', ')}</Highlight>
          {atTime && (
            <>
              {' '}
              at <Highlight>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight>Weekly</Highlight> on <Highlight>{weekDays?.map((item) => capitalize(item)).join(', ')}</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  const amount = watch(`steps.${index}.digestMetadata.timed.months.amount`);
  const monthlyType = watch(`steps.${index}.digestMetadata.timed.months.monthlyType`);
  const atTime = watch(`steps.${index}.digestMetadata.timed.months.atTime`);
  const monthDays = watch(`steps.${index}.digestMetadata.timed.months.monthDays`) || [];

  if (monthlyType === MonthlyTypeEnum.ON) {
    const ordinal = watch(`steps.${index}.digestMetadata.timed.months.ordinal`);
    const ordinalValue = watch(`steps.${index}.digestMetadata.timed.months.ordinalValue`);

    if (!ordinal || !ordinalValue) {
      return null;
    }

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight>{getOrdinal(amount)} </Highlight> month on{' '}
          <Highlight>
            {getOrdinal(ordinal)} {getOrdinalValueLabel(ordinalValue)}
          </Highlight>
          {atTime && (
            <>
              {' '}
              at <Highlight>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight>Monthly</Highlight> on the{' '}
        <Highlight>
          {getOrdinal(ordinal)} {getOrdinalValueLabel(ordinalValue)}
        </Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  if (amount !== '' && amount !== '1') {
    return (
      <>
        Every <Highlight>{getOrdinal(amount)} </Highlight> month on{' '}
        <Highlight>{monthDays?.map((item) => getOrdinal(item)).join(', ')}</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Highlight>Monthly</Highlight> on <Highlight>{monthDays?.map((item) => getOrdinal(item)).join(', ')}</Highlight>
      {atTime && (
        <>
          {' '}
          at <Highlight>{atTime}</Highlight>
        </>
      )}
    </>
  );
};
