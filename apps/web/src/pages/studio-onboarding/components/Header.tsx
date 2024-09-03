import { css } from '@novu/novui/css';
import { Stepper } from '@mantine/core';
import { IconCheck } from '@novu/novui/icons';
import { VStack } from '@novu/novui/jsx';
import { useColorScheme } from '@novu/design-system';
import { COMPANY_LOGO_TEXT_PATH, COMPANY_LOGO_TEXT_PATH_DARK_TEXT } from '../../../constants/assets';

export const Header = ({ activeStepIndex = 0 }: { activeStepIndex?: number }) => {
  const { colorScheme } = useColorScheme();

  return (
    <div
      className={css({
        backgroundColor: 'surface.panel',
        zIndex: 'docked',
        position: 'relative',
        paddingBottom: '375',
      })}
    >
      <div className={css({ padding: '100', width: '100%', height: '375' })}>
        <img
          // TODO: these assets are not the same dimensions!
          src={colorScheme === 'dark' ? COMPANY_LOGO_TEXT_PATH : COMPANY_LOGO_TEXT_PATH_DARK_TEXT}
          className={css({
            h: '200',
          })}
        />
      </div>
      <VStack alignContent="center">
        <div
          className={css({
            width: 'onboarding',
          })}
        >
          <Stepper
            classNames={{
              separator: css({
                marginLeft: '50 !important',
                marginRight: '50 !important',
                backgroundColor: 'transparent !important',
                borderBottom: 'dashed',
                borderColor: { base: 'typography.text.main', _dark: 'table.header.border' },
              }),
              stepIcon: css({
                border: 'none !important',
                width: '200 !important',
                minWidth: '200 !important',
                height: '200 !important',
                backgroundColor: 'surface.popover !important',
                color: 'typography.text.secondary !important',
                '&[data-progress]': {
                  backgroundColor: 'table.header.border !important',
                  color: 'typography.text.main !important',
                },
              }),
              stepBody: css({
                marginLeft: '50 !important',
              }),
              stepCompletedIcon: css({
                backgroundColor: 'typography.text.feedback.success',
                borderRadius: '200',
              }),
            }}
            progressIcon={({ step }) => <>{step + 1}</>}
            completedIcon={() => {
              return (
                <IconCheck
                  className={css({
                    color: { _dark: 'typography.text.main !important', base: 'table.header.border' },
                  })}
                />
              );
            }}
            active={activeStepIndex}
          >
            <Stepper.Step label="Create Novu app"></Stepper.Step>
            <Stepper.Step label="Test workflow"></Stepper.Step>
            <Stepper.Step label="Check your Inbox"></Stepper.Step>
          </Stepper>
        </div>
      </VStack>
    </div>
  );
};
