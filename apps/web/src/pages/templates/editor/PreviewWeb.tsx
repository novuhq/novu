import { createStyles, Group } from '@mantine/core';
import { format } from 'date-fns';
import { colors } from '../../../design-system';
import { PreviewDateIcon } from './PreviewDateIcon';
import { PreviewUserIcon } from './PreviewUserIcon';
import Frame from 'react-frame-component';
import { ErrorBoundary } from 'react-error-boundary';

const useStyles = createStyles((theme) => ({
  browser: {
    background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
    marginLeft: '30px',
    marginRight: '30px',
    borderRadius: '7px',
  },
  bar: {
    borderRadius: '7px 7px 0 0',
    background: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    width: '100%',
    height: '45px',
    maxHeight: '45px',
  },
  barAction: {
    height: '10px',
    width: '10px',
    borderRadius: '10px',
    background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
  },
  header: {
    width: '90%',
    maxWidth: '643px',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: '40px',
  },
  subject: {
    marginBottom: '3px',
    fontWeight: 'bolder',
  },
  from: {
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B40,
    fontWeight: 'normal',
  },
  date: {
    height: '20px',
    marginTop: '20px',
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B40,
    fontWeight: 'normal',
  },
  content: {
    borderRadius: '7px 7px 0 0',
    width: '90%',
    maxWidth: '643px',
    marginLeft: 'auto',
    marginRight: 'auto',
    height: '50vh',
    background: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
    marginTop: '20px',
  },
  frame: {
    border: '0px',
    width: '100%',
    height: '100%',
  },
  fallbackFrame: {
    border: '0px',
    width: '100%',
    height: '100%',
    padding: '15px',
    textAlign: 'center',
  },
  bottom: {
    height: '30px',
  },
}));

export const PreviewWeb = ({
  integration,
  subject,
  content,
}: {
  integration: any;
  subject: string;
  content: string;
}) => {
  const { classes } = useStyles();

  return (
    <>
      <div className={classes.browser}>
        <div className={classes.bar}>
          <Group
            sx={{
              marginLeft: '20px',
              height: '45px',
            }}
            spacing={7}
          >
            <div className={classes.barAction}></div>
            <div className={classes.barAction}></div>
            <div className={classes.barAction}></div>
          </Group>
        </div>
        <div className={classes.header}>
          <Group
            sx={{
              height: '40px',
            }}
            position="apart"
          >
            <div>
              <Group
                sx={{
                  height: '40px',
                }}
              >
                <PreviewUserIcon />
                <div>
                  <div data-test-id="preview-subject" className={classes.subject}>
                    {subject}
                  </div>
                  <div data-test-id="preview-from" className={classes.from}>
                    {integration?.credentials?.from || 'No active email integration'}
                  </div>
                </div>
              </Group>
            </div>
            <div>
              <div className={classes.date}>
                <PreviewDateIcon />
                <span
                  data-test-id="preview-date"
                  style={{
                    marginLeft: '15px',
                  }}
                >
                  {format(new Date(), 'EEE, MMM d, HH:mm')}
                </span>
              </div>
            </div>
          </Group>
        </div>
        <div className={classes.content}>
          <ErrorBoundary
            FallbackComponent={() => (
              <div data-test-id="preview-content" className={classes.fallbackFrame}>
                Oops! We've recognized some glitch in this HTML. Please give it another look!
              </div>
            )}
            resetKeys={[content]}
          >
            <Frame className={classes.frame} data-test-id="preview-content" initialContent={content}>
              <></>
            </Frame>
          </ErrorBoundary>
        </div>
      </div>
      <div className={classes.bottom}></div>
    </>
  );
};
