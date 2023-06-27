import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import {
  ActionIcon,
  Container,
  createStyles,
  Drawer,
  Group,
  Image,
  MantineTheme,
  Radio,
  Input as MantineInput,
  Space,
  Stack,
  Tabs,
  TabsValue,
  Text,
  TextInput,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { colors } from '../../../../design-system';
import { Close } from '../../../../design-system/icons/actions/Close';
import { Button, Input, shadows, Title } from '../../../../design-system';
import { ArrowLeft } from '../../../../design-system/icons';
import { IIntegratedProvider } from '../../IntegrationsStoreModal';
import { Controller, useForm } from 'react-hook-form';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';

export function SidebarCreateProviderConditions({
  onClose,
  provider,
  goBack,
}: {
  onClose: () => void;
  goBack: () => void;
  provider: IIntegratedProvider;
}) {
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const {
    register,
    handleSubmit: handleSubmitIntegration,
    setValue,
    formState: { errors },
    control,
    watch,
  } = useForm({
    shouldUseNativeValidation: false,
    defaultValues: {
      name: provider.displayName,
      env: environments?.find((env) => env.name === 'Development')?._id || '',
    },
  });

  const { colorScheme } = useMantineColorScheme();

  return (
    <FormStyled>
      <Group spacing={5}>
        <ActionIcon onClick={goBack} variant={'transparent'}>
          <ArrowLeft color={colors.B80} />
        </ActionIcon>
        <img
          src={provider.logoFileName[`${colorScheme}`]}
          alt={provider.displayName}
          style={{
            height: '24px',
            maxWidth: '140px',
          }}
        />
        <Controller
          control={control}
          name="name"
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <TextInput
                styles={(theme) => ({
                  root: {
                    flex: '1 1 auto',
                  },
                  wrapper: {
                    background: 'transparent',
                    width: '100%',
                  },
                  input: {
                    background: 'transparent',
                    borderStyle: 'solid',
                    borderColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
                    borderWidth: '1px',
                    fontSize: '20px',
                    fontWeight: 'bolder',
                    padding: 9,
                    lineHeight: '28px',
                    minHeight: 'auto',
                    height: 'auto',
                    width: '100%',
                    textOverflow: 'ellipsis',
                    '&:not(:placeholder-shown)': {
                      borderStyle: 'none',
                      padding: 10,
                    },
                    '&:hover, &:focus': {
                      borderStyle: 'solid',
                      padding: 9,
                    },
                    '&:disabled': {
                      backgroundColor: colorScheme === 'dark' ? colors.B15 : theme.white,
                      color: colorScheme === 'dark' ? theme.white : theme.black,
                      opacity: 1,
                    },
                  },
                })}
                {...field}
                value={field.value !== undefined ? field.value : provider.displayName}
                // error={showErrors && fieldState.error?.message}
                type="text"
                data-test-id="title"
                placeholder="Enter workflow name"
                // disabled={readonly}
              />
            );
          }}
        />
        <ActionIcon variant={'transparent'} onClick={onClose}>
          <Close color={colors.B40} />
        </ActionIcon>
      </Group>
      <Text py={24} color={colors.B40}>
        Specify assignment preferences to automatically allocate the provider instance to the {provider.channel}{' '}
        channel.
      </Text>
      <Controller
        control={control}
        name={'env'}
        defaultValue=""
        render={({ field, fieldState }) => {
          return (
            <Radio.Group
              styles={inputStyles}
              sx={{
                ['.mantine-Group-root']: {
                  paddingTop: 0,
                  paddingLeft: '10px',
                },
              }}
              label="Environment"
              description="Provider instance executes only for"
              spacing={26}
              {...field}
            >
              {environments
                ?.map((environment) => {
                  return { value: environment._id, label: environment.name };
                })
                .map((option) => (
                  <Radio
                    styles={() => ({
                      radio: {
                        backgroundColor: 'transparent',
                        borderColor: colors.B60,
                        '&:checked': { borderColor: 'transparent' },
                      },
                      label: {
                        paddingLeft: 10,
                        fontSize: '14px',
                        fontWeight: 400,
                      },
                    })}
                    key={option.value}
                    // data-test-id={`${testId}-${option.value}`}
                    value={option.value}
                    label={option.label}
                  />
                ))}
            </Radio.Group>
          );
        }}
      />
      <Footer>
        {/*<div>*/}
        <Group>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button submit>Create</Button>
        </Group>
      </Footer>
      {/*</div>*/}
    </FormStyled>
  );
}

const Footer = styled.div`
  padding: 15px;
  height: 80px;
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 20px;
`;

const FormStyled = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;

  > *:last-child {
    margin-top: auto;
  }
`;
