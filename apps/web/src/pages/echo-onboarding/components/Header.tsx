import { css } from '@novu/novui/css';
import { hstack, vstack } from '@novu/novui/patterns';
import { COMPANY_LOGO_PATH } from '../../../constants/assets';
import { Stepper } from '@mantine/core';
import { IconCheck } from '@novu/design-system';

export const Header = ({ active = 0 }: { active?: number }) => {
  return (
    <div className={css({ backgroundColor: 'surface.panel', zIndex: 1, position: 'relative', paddingBottom: '375' })}>
      <div className={css({ padding: '100', width: '100%', height: '375' })}>
        <div className={hstack({ gap: '150' })}>
          <img
            src={COMPANY_LOGO_PATH}
            className={css({
              w: '200',
              h: '200',
              borderRadius: '50',
            })}
          />
          <svg width="60" height="14" viewBox="0 0 60 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              // eslint-disable-next-line max-len
              d="M29.4803 7.01708C29.487 2.91551 26.5327 0.0380957 22.3165 0.0347692C18.0325 0.0347692 15.0883 2.87559 15.0883 7.01708C15.0883 11.3515 18.5006 14.2256 22.2317 13.9861C26.5361 13.9861 29.4769 11.1586 29.4836 7.01708H29.4803ZM19.3384 3.6041C21.4211 1.46849 24.874 2.09054 26.0069 4.82159C26.6039 6.26529 26.5869 7.74226 26.0341 9.18595C25.3455 10.9756 23.6869 11.8571 21.6178 11.6143C19.8065 11.4014 18.4362 9.94107 18.1886 7.94517C18.1512 7.64579 18.1546 7.33975 18.1377 7.05367C18.1784 5.76965 18.3955 4.57211 19.3384 3.6041ZM0.0106202 12.3994C0.0174041 13.5237 0.176823 13.6501 1.46236 13.6501C2.73094 13.6501 2.89036 13.5204 2.89715 12.3827C2.90732 9.81466 2.90054 7.24661 2.90054 4.68188C2.90054 2.84566 3.02943 2.70262 4.90516 2.44315C5.0171 2.42652 5.12903 2.41321 5.24096 2.40656C8.19193 2.16705 9.65385 3.46438 9.66742 6.35511C9.67759 8.37096 9.66403 10.3868 9.6742 12.3994C9.68099 13.5237 9.84041 13.6501 11.1259 13.6501C12.4013 13.6501 12.5573 13.5237 12.5607 12.3827C12.5709 10.0908 12.5675 7.79881 12.5607 5.51018C12.5539 2.64274 10.9326 0.666804 8.0359 0.194441C5.67173 -0.191432 3.31774 0.001504 1.01802 0.733333C0.281974 0.966187 -0.0131218 1.38865 0.000445894 2.13379C0.0275813 3.8436 0.0106202 5.55675 0.0106202 7.26989C0.0106202 8.98304 0.000444479 10.6929 0.0106202 12.406V12.3994ZM59.9872 1.62816C59.9804 0.66015 59.6073 0.344133 58.627 0.40401C57.6909 0.46056 57.2499 0.856412 57.1414 1.78118C57.1007 2.13711 57.1041 2.49637 57.1007 2.85564C57.0973 5.34053 57.1007 7.82542 57.0939 10.3103C57.0939 10.7793 57.1142 11.2484 56.5206 11.4713C53.5018 12.6089 50.5475 10.7228 50.5102 7.60254C50.4864 5.66985 50.5102 3.73716 50.5 1.80446C50.4932 0.626884 49.8793 0.171156 48.7057 0.447255C47.8611 0.646844 47.6236 1.25892 47.6202 2.01071C47.6135 4.05317 47.5897 6.09897 47.6202 8.14143C47.6677 11.3315 49.323 13.364 52.5623 13.7466C54.6958 13.9961 56.887 13.7998 59.051 13.7732C59.7599 13.7632 59.9974 13.2942 59.994 12.6522C59.9838 10.8292 59.994 9.00632 59.994 7.1834C59.994 5.33387 60.0075 3.48434 59.994 1.63149L59.9872 1.62816ZM37.9702 10.6197C37.648 9.92776 37.3054 9.24583 37.0069 8.54394C35.9826 6.14887 34.9752 3.74714 33.9542 1.35206C33.598 0.517111 32.9434 0.217726 32.0445 0.457233C31.2746 0.66015 30.8981 1.24894 31.0643 2.13046C31.1559 2.6128 31.3322 3.09182 31.5459 3.53757C32.8993 6.3917 34.3375 9.21257 35.6162 12.1C36.237 13.5037 37.1562 13.9961 38.6452 13.8264C39.31 13.7499 39.7408 13.5304 40.0291 12.9382C40.5718 11.8139 41.2027 10.7294 41.7183 9.59511C42.8783 7.04702 44.0079 4.48895 45.1204 1.92089C45.5105 1.01941 45.2086 0.570334 44.2317 0.420642C43.2752 0.274276 42.6172 0.653497 42.1932 1.64812C41.2706 3.81699 40.3751 5.99252 39.4525 8.16139C39.0997 8.98969 38.6961 9.80136 38.3162 10.6197C38.2009 10.6197 38.089 10.6197 37.9736 10.6197H37.9702Z"
              fill="white"
            />
          </svg>
        </div>
      </div>
      <div className={vstack({ alignContent: 'center' })}>
        <div
          className={css({
            width: '680px',
          })}
        >
          <Stepper
            classNames={{
              separator: css({
                marginLeft: '50 !important',
                marginRight: '50 !important',
                backgroundColor: 'transparent !important',
                borderBottom: `1px dashed`,
                borderColor: 'legacy.B30',
              }),
              stepIcon: css({
                border: 'none !important',
                width: '300 !important',
                height: '300 !important',
                backgroundColor: 'surface.popover !important',
                color: 'typography.text.secondary !important',
                '&[data-progress]': {
                  backgroundColor: 'legacy.B30 !important',
                  color: 'typography.text.main !important',
                },
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
            <Stepper.Step label="Add the Echo endpoint"></Stepper.Step>
            <Stepper.Step label="Create a workflow"></Stepper.Step>
            <Stepper.Step label="Test a workflow"></Stepper.Step>
          </Stepper>
        </div>
      </div>
    </div>
  );
};
