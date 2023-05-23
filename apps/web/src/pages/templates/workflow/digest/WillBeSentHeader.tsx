import { useFormContext } from 'react-hook-form';
import { useMantineColorScheme } from '@mantine/core';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

import { colors } from '../../../../design-system';
import { pluralizeTime } from '../../../../utils';
import { TimedDigestWillBeSentHeader } from './TimedDigestWillBeSentHeader';

const DIGEST_UNIT_TYPE_TO_SINGULAR = {
  [DigestUnitEnum.SECONDS]: 'second',
  [DigestUnitEnum.MINUTES]: 'minute',
  [DigestUnitEnum.HOURS]: 'hour',
  [DigestUnitEnum.DAYS]: 'day',
  [DigestUnitEnum.WEEKS]: 'week',
  [DigestUnitEnum.MONTHS]: 'month',
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

export const WillBeSentHeader = ({ index }: { index: number }) => {
  const { watch } = useFormContext();

  const type = watch(`steps.${index}.digestMetadata.type`);

  if (type === DigestTypeEnum.TIMED) {
    return <TimedDigestWillBeSentHeader index={index} />;
  }

  const unit = watch(`steps.${index}.digestMetadata.regular.unit`);
  const amount = watch(`steps.${index}.digestMetadata.regular.amount`);
  const backoff = watch(`steps.${index}.digestMetadata.regular.backoff`);

  return (
    <>
      after <Highlight>{pluralizeTime(amount, DIGEST_UNIT_TYPE_TO_SINGULAR[unit])}</Highlight>
      {backoff ? (
        <>
          <br /> only if <Highlight>frequent events</Highlight> occur
        </>
      ) : (
        ' occur on'
      )}
    </>
  );
};
