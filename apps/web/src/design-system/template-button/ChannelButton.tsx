import React, { useEffect, useState } from 'react';
import { UnstyledButton, Popover, ActionIcon, createStyles, MantineTheme, Menu } from '@mantine/core';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { Text } from '../typography/text/Text';
import { Switch } from '../switch/Switch';
import { useStyles } from './TemplateButton.styles';
import { colors, shadows } from '../config';
import { DotsHorizontal, Edit, Trash } from '../icons';
import { When } from '../../components/utils/When';
import { useEnvController } from '../../store/use-env-controller';
import { getChannel, NodeTypeEnum } from '../../pages/templates/shared/channels';

const capitalize = (text: string) => {
  return typeof text !== 'string' ? '' : text.charAt(0).toUpperCase() + text.slice(1);
};

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  label: string;
  active?: boolean;
  action?: boolean;
  testId?: string;
  tabKey: string;
  checked?: boolean;
  readonly?: boolean;
  switchButton?: (boolean) => void;
  changeTab?: (string) => void;
  errors?: boolean | string;
  showDots?: boolean;
  id?: string | undefined;
  onDelete?: (id: string) => void;
  dragging?: boolean;
  setActivePage?: (string) => void;
  disabled?: boolean;
}

const useMenuStyles = createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    arrow: {
      width: '7px',
      height: '7px',
      backgroundColor: dark ? colors.B20 : colors.white,
      borderColor: dark ? colors.B30 : colors.B85,
    },
    dropdown: {
      minWidth: 220,
      backgroundColor: dark ? colors.B20 : colors.white,
      color: dark ? theme.white : colors.B40,
      borderColor: dark ? colors.B30 : colors.B85,
    },
    item: {
      borerRadius: '5px',
      color: `${dark ? theme.white : colors.B40} !important`,
      fontWeight: 400,
      fontSize: '14px',
    },
    itemHovered: {
      backgroundColor: dark ? colors.B30 : colors.B98,
    },
  };
});

const usePopoverStyles = createStyles(() => ({
  dropdown: {
    padding: '12px 15px 14px',
    backgroundColor: colors.error,
    color: colors.white,
    border: 'none',
  },
  arrow: {
    backgroundColor: colors.error,
    width: '7px',
    height: '7px',
    margin: '0px',
  },
}));

const MENU_CLICK_OUTSIDE_EVENTS = ['click', 'mousedown', 'touchstart'];

export function ChannelButton({
  active = false,
  action = false,
  switchButton,
  checked = false,
  readonly = false,
  label,
  Icon,
  tabKey,
  testId,
  errors = false,
  showDots = true,
  id = undefined,
  onDelete = () => {},
  dragging = false,
  setActivePage = (page: string) => {},
  disabled: initDisabled,
}: ITemplateButtonProps) {
  const { readonly: readonlyEnv } = useEnvController();
  const { cx, classes, theme } = useStyles();
  const { classes: menuClasses } = useMenuStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [disabled, setDisabled] = useState(initDisabled);
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled: disabled } : {};
  const { classes: popoverClasses } = usePopoverStyles();

  const { watch } = useFormContext();

  useEffect(() => {
    const subscription = watch((values) => {
      const thisStep = values.steps.find((step) => step._id === id);
      if (thisStep) {
        setDisabled(!thisStep.active);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (showDotMenu && (dragging || !active)) {
      setShowDotMenu(false);
    }
  }, [dragging, showDotMenu, active]);

  return (
    <Button
      type={'button'}
      onMouseEnter={() => setPopoverOpened(true)}
      onMouseLeave={() => setPopoverOpened(false)}
      data-test-id={testId}
      className={cx(classes.button, { [classes.active]: active })}
      style={{ pointerEvents: 'all' }}
      sx={{
        backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
      }}
    >
      <ButtonWrapper>
        <LeftContainerWrapper>
          <IconWrapper className={classes.linkIcon}>{Icon ? <Icon {...disabledProp} /> : null}</IconWrapper>
          <StyledContentWrapper>
            <Text {...disabledColor} weight="bold">
              {label}
            </Text>
          </StyledContentWrapper>
        </LeftContainerWrapper>

        <ActionWrapper>
          {action && !readonly && (
            <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />
          )}
          <When truthy={showDots && !readonlyEnv}>
            <Menu
              withinPortal
              position="bottom-start"
              shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.light}
              classNames={menuClasses}
              withArrow={true}
              opened={showDotMenu}
              onClose={() => setShowDotMenu(false)}
              clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
            >
              <Menu.Target>
                <ActionIcon
                  variant="transparent"
                  data-test-id="step-actions-dropdown"
                  style={{ pointerEvents: 'all' }}
                  component="span"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDotMenu(!showDotMenu);
                  }}
                >
                  <DotsHorizontal
                    style={{
                      color: theme.colorScheme === 'dark' ? colors.B40 : colors.B80,
                    }}
                  />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <When truthy={getChannel(tabKey)?.type === NodeTypeEnum.CHANNEL}>
                  <Menu.Item
                    key="edit"
                    style={{
                      pointerEvents: 'all',
                    }}
                    icon={
                      <Edit
                        style={{
                          width: '20px',
                          height: '20px',
                        }}
                      />
                    }
                    data-test-id="edit-step-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDotMenu(false);
                      setActivePage(tabKey === ChannelTypeEnum.IN_APP ? tabKey : capitalize(tabKey));
                    }}
                  >
                    Edit Template
                  </Menu.Item>
                </When>
                <Menu.Item
                  key="delete"
                  style={{
                    pointerEvents: 'all',
                  }}
                  icon={<Trash />}
                  data-test-id="delete-step-action"
                  onClick={() => {
                    setShowDotMenu(false);
                    onDelete(id || '');
                  }}
                >
                  Delete {getChannel(tabKey)?.type === NodeTypeEnum.CHANNEL ? 'Step' : 'Action'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </When>
        </ActionWrapper>
      </ButtonWrapper>

      {errors && (
        <Popover
          withinPortal
          classNames={popoverClasses}
          withArrow
          opened={popoverOpened}
          transition="rotate-left"
          transitionDuration={250}
          offset={theme.spacing.xs}
          position="right"
          zIndex={4}
        >
          <Popover.Target>
            <ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />
          </Popover.Target>
          <Popover.Dropdown>{errors.toString() || 'Something is missing here'}</Popover.Dropdown>
        </Popover>
      )}
    </Button>
  );
}

const ErrorCircle = styled.div<{ dark: boolean }>`
  width: 11px;
  height: 11px;
  display: inline-block;
  position: absolute;
  right: -6px;
  top: calc(50% - 4px);
  background: ${colors.error};
  border-radius: 50%;
  border: 3px solid ${({ dark }) => (dark ? colors.B15 : 'white')};
`;

const IconWrapper = styled.div`
  padding-right: 15px;
  @media screen and (max-width: 1400px) {
    padding-right: 5px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const LeftContainerWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StyledContentWrapper = styled.div`
  padding-right: 10px;
`;

const Button: any = styled(UnstyledButton)`
  position: relative;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
