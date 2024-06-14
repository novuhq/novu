import { css } from '@novu/novui/css';
import { COMPANY_LOGO_PATH, COMPANY_LOGO_TEXT_PATH } from '../../../constants/assets';
import { Stepper } from '@mantine/core';
import { IconCheck } from '@novu/novui/icons';
import { HStack, VStack } from '@novu/novui/jsx';

export const Header = ({ active = 0 }: { active?: number }) => {
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
          src={COMPANY_LOGO_TEXT_PATH}
          className={css({
            h: '200',
          })}
        />
      </div>
      <VStack alignContent="center">
        <div
          className={css({
            width: '880px',
          })}
        >
          <Stepper
            classNames={{
              separator: css({
                marginLeft: '50 !important',
                marginRight: '50 !important',
                backgroundColor: 'transparent !important',
                borderBottom: 'dashed',
                borderColor: 'table.header.border',
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
                    color: 'typography.text.main !important',
                  })}
                />
              );
            }}
            active={active}
          >
            <Stepper.Step label="Add the endpoint"></Stepper.Step>
            <Stepper.Step label="Create workflow"></Stepper.Step>
            <Stepper.Step label="Test workflow"></Stepper.Step>
          </Stepper>
        </div>
      </VStack>
    </div>
  );
};
