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
import { ChannelTypeEnum } from '@novu/shared';
import { CONTEXT_PATH } from '../../../../config';
import { colors } from '../../../../design-system';
import { Close } from '../../../../design-system/icons/actions/Close';
import { useIntegrationLimit } from '../../../../hooks';
import { useProviders } from '../../useProviders';
import { Button, Input, shadows, Title } from '../../../../design-system';
import {
  ArrowLeft,
  Chat,
  ChevronLeft,
  DoubleArrowRight,
  InApp,
  Mail,
  Mobile,
  Search,
  Sms,
} from '../../../../design-system/icons';
import useStyles from '../../../../design-system/radio/Radio.styles';
import { IIntegratedProvider } from '../../IntegrationsStoreModal';
import { Controller, useForm } from 'react-hook-form';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';

export function SidebarUpdateProvider({
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
  const isDark = colorScheme === 'dark';
  const { classes } = useStyles();

  return (
    <FormStyled>
      <Group spacing={5}>
        <ActionIcon onClick={goBack} variant={'transparent'}>
          <ArrowLeft color={colors.B80} />
        </ActionIcon>
        <img
          src={'/static/images/providers/' + colorScheme + '/square/' + provider.providerId + '.svg'}
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
const ContentWrapper = styled.div`
  padding: 0 30px;
`;

const Header = styled.div`
  //padding: 30px;
  //height: 120px;
  display: flex;
  //justify-content: space-between;
  //align-items: center;

  //box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
`;
const ColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

const InlineDiv = styled.div`
  display: inline;
  span {
    margin-right: 5px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  right: 0;
  top: 0;
  background: transparent;
  border: none;
  color: ${colors.B40};
  outline: none;

  &:hover {
    cursor: pointer;
  }
`;
const CenterDiv = styled.div`
  //overflow: hidden;
  overflow: auto;
  //padding: 30px;
  //padding: 30px;

  //height: 80%;
`;

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
  //border-radius: 12px;

  position: fixed;
  width: 50%;
  top: 0px;
  bottom: 0px;
  max-height: 100%;
  z-index: 201;
  pointer-events: none;
  display: flex;
  -webkit-box-pack: start;
  justify-content: flex-start;
  align-items: flex-start;
`;
const DRAWER_PADDING = 30;
const DRAWER_PADDING_SMALL = 20;
const HEADER_HEIGHT_SMALL = 70;
// const HEADER_HEIGHT = 90;
const HEADER_HEIGHT = 65;
const HEADER_MARGIN = 10;
const DISTANCE_FROM_HEADER = 64;
const INTEGRATION_SETTING_TOP_SMALL = HEADER_HEIGHT_SMALL + HEADER_MARGIN;
const INTEGRATION_SETTING_TOP = HEADER_HEIGHT + HEADER_MARGIN + DISTANCE_FROM_HEADER;

const useDrawerStyles = createStyles((theme: MantineTheme) => {
  return {
    drawer: {
      // top: 0,
      top: `${HEADER_HEIGHT + DRAWER_PADDING}px`,
      // top: `${INTEGRATION_SETTING_TOP_SMALL - DRAWER_PADDING_SMALL}px`,
      display: 'flex',
      flexDirection: 'column',
      marginRight: '30px',
      // justifyContent: 'end',
      height: `calc(100vh - ${INTEGRATION_SETTING_TOP_SMALL + DRAWER_PADDING_SMALL}px)`,

      overflow: 'auto',
      borderRadius: '0 7px 7px 0 ',
      // overflow: 'hidden',
      background: colors.B17,
      width: 660,
      // height: 800,
      padding: `${DRAWER_PADDING_SMALL}px !important`,
      boxShadow: 'none',

      '@media screen and (min-width: 1367px)': {
        top: `${HEADER_HEIGHT + DRAWER_PADDING}px`,
        // top: `${INTEGRATION_SETTING_TOP - DRAWER_PADDING}px`,
        height: `calc(100vh - ${INTEGRATION_SETTING_TOP + DRAWER_PADDING}px)`,

        padding: `${DRAWER_PADDING}px !important`,
      },
    },
  };
});

const FormStyled = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;

  > *:last-child {
    margin-top: auto;
  }
`;
