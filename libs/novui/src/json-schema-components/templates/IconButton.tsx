import React from 'react';
import { IconButtonProps } from '@rjsf/utils';
import { ActionIcon } from '@mantine/core';
import {
  IconArrowDownward,
  IconArrowUpward,
  IconLocalHospital,
  IconOutlineDeleteOutline,
} from '../../icons/icon-registry';

export function RemoveButton(props: IconButtonProps) {
  const { icon, iconType, ...btnProps } = props;

  return (
    <ActionIcon {...btnProps} variant={'transparent'}>
      <IconOutlineDeleteOutline title={'Remove'} />
    </ActionIcon>
  );
}

export function MoveUpButton(props: IconButtonProps) {
  const { icon, iconType, ...btnProps } = props;

  return (
    <ActionIcon {...btnProps} variant={'transparent'}>
      <IconArrowUpward title={'Move up'} />
    </ActionIcon>
  );
}
export function AddButton(props: IconButtonProps) {
  const { icon, iconType, ...btnProps } = props;

  return (
    <ActionIcon {...btnProps} variant={'transparent'}>
      <IconLocalHospital title={'Add item'} />
    </ActionIcon>
  );
}

export function MoveDownButton(props: IconButtonProps) {
  const { icon, iconType, ...btnProps } = props;

  return (
    <ActionIcon {...btnProps} variant={'transparent'}>
      <IconArrowDownward title={'Move down'} />
    </ActionIcon>
  );
}
