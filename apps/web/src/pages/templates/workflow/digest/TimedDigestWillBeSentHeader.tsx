import { useFormContext } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { useMantineColorScheme } from '@mantine/core';
import { DigestUnitEnum, MonthlyTypeEnum } from '@novu/shared';

import { colors } from '@novu/design-system';
import { pluralizeTime } from '../../../../utils';

const Highlight = ({ children, isHighlight }) => {
  const { colorScheme } = useMantineColorScheme();
  if (!isHighlight) {
    return children;
  }

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

const WEEKDAYS_ORDER: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const sortWeekdays = (weekdays: string[]): string[] => {
  return weekdays.sort((a, b) => WEEKDAYS_ORDER.indexOf(a) - WEEKDAYS_ORDER.indexOf(b));
};

export const TimedDigestWillBeSentHeader = ({ path, isHighlight = true }: { path: string; isHighlight?: boolean }) => {
  const { watch } = useFormContext();

  const unit = watch(`${path}.digestMetadata.timed.unit`);
  if (unit == DigestUnitEnum.MINUTES) {
    const amount = watch(`${path}.digestMetadata.timed.minutes.amount`);

    return (
      <>
        Every <Highlight isHighlight={isHighlight}>{pluralizeTime(amount, 'minute')}</Highlight>
      </>
    );
  }

  if (unit == DigestUnitEnum.HOURS) {
    const amount = watch(`${path}.digestMetadata.timed.hours.amount`);

    return (
      <>
        Every <Highlight isHighlight={isHighlight}>{pluralizeTime(amount, 'hour')}</Highlight>
      </>
    );
  }

  if (unit === DigestUnitEnum.DAYS) {
    const amount = watch(`${path}.digestMetadata.timed.days.amount`);
    const atTime = watch(`${path}.digestMetadata.timed.days.atTime`);

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight isHighlight={isHighlight}>{getOrdinal(amount)} </Highlight> day
          {atTime && (
            <>
              {' '}
              at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight isHighlight={isHighlight}>Daily</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  if (unit === DigestUnitEnum.WEEKS) {
    const amount = watch(`${path}.digestMetadata.timed.weeks.amount`);
    const atTime = watch(`${path}.digestMetadata.timed.weeks.atTime`);
    const weekDays = watch(`${path}.digestMetadata.timed.weeks.weekDays`) || [];

    const weekDaysString =
      weekDays?.length > 2
        ? sortWeekdays(weekDays)
            ?.slice(0, 2)
            .map((item) => capitalize(item))
            .join(', ')
            .concat('...')
        : sortWeekdays(weekDays)
            ?.map((item) => capitalize(item))
            .join(', ');

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight isHighlight={isHighlight}>{getOrdinal(amount)} </Highlight> week on{' '}
          <Highlight isHighlight={isHighlight}>{weekDaysString}</Highlight>
          {atTime && (
            <>
              {' '}
              at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight isHighlight={isHighlight}>Weekly</Highlight> on{' '}
        <Highlight isHighlight={isHighlight}>{weekDaysString}</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  const amount = watch(`${path}.digestMetadata.timed.months.amount`);
  const monthlyType = watch(`${path}.digestMetadata.timed.months.monthlyType`);
  const atTime = watch(`${path}.digestMetadata.timed.months.atTime`);
  const monthDays = watch(`${path}.digestMetadata.timed.months.monthDays`) || [];

  if (monthlyType === MonthlyTypeEnum.ON) {
    const ordinal = watch(`${path}.digestMetadata.timed.months.ordinal`);
    const ordinalValue = watch(`${path}.digestMetadata.timed.months.ordinalValue`);

    if (!ordinal || !ordinalValue) {
      return null;
    }

    if (amount !== '' && amount !== '1') {
      return (
        <>
          Every <Highlight isHighlight={isHighlight}>{getOrdinal(amount)} </Highlight> month on{' '}
          <Highlight isHighlight={isHighlight}>
            {getOrdinal(ordinal)} {getOrdinalValueLabel(ordinalValue)}
          </Highlight>
          {atTime && (
            <>
              {' '}
              at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
            </>
          )}
        </>
      );
    }

    return (
      <>
        <Highlight isHighlight={isHighlight}>Monthly</Highlight> on the{' '}
        <Highlight isHighlight={isHighlight}>
          {getOrdinal(ordinal)} {getOrdinalValueLabel(ordinalValue)}
        </Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  const monthDaysString =
    monthDays?.length > 3
      ? monthDays
          .sort()
          ?.slice(0, 3)
          .map((item) => getOrdinal(item))
          .join(', ')
          .concat('...')
      : monthDays
          .sort()
          ?.map((item) => getOrdinal(item))
          .join(', ');

  if (amount !== '' && amount !== '1') {
    return (
      <>
        Every <Highlight isHighlight={isHighlight}>{getOrdinal(amount)} </Highlight> month on{' '}
        <Highlight isHighlight={isHighlight}>{monthDaysString}</Highlight>
        {atTime && (
          <>
            {' '}
            at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Highlight isHighlight={isHighlight}>Monthly</Highlight> on{' '}
      <Highlight isHighlight={isHighlight}>{monthDaysString}</Highlight>
      {atTime && (
        <>
          {' '}
          at <Highlight isHighlight={isHighlight}>{atTime}</Highlight>
        </>
      )}
    </>
  );
};
